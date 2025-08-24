import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// Supabase client with service role key for database access
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const revenuecatWebhookSecret = Deno.env.get("REVENUECAT_WEBHOOK_SECRET");

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

interface RevenueCatEvent {
  event: {
    type: string;
    app_user_id: string;
    original_app_user_id: string;
    purchased_at_ms: number;
    expiration_at_ms?: number;
    environment: "PRODUCTION" | "SANDBOX";
    product_id: string;
    period_type: "NORMAL" | "TRIAL" | "INTRO";
    price_in_purchased_currency: number;
    purchased_currency: string;
    store: "APP_STORE" | "PLAY_STORE" | "STRIPE" | "PROMOTIONAL";
    entitlements: Record<string, any>;
  };
  api_version: string;
}

// Credit packages configuration - App Store'daki gerçek ürünler
const CREDIT_PACKAGES = {
  "com.yemekbulucu.credits_starter": {
    credits: 10,
    description: "Starter Pack - 10 Kredi",
  },
  "com.yemekbulucu.credits_popular": {
    credits: 30, // 25 + 5 bonus
    description: "Popular Pack - 30 Kredi (25 + 5 bonus)",
  },
  "com.yemekbulucu.credits_premium": {
    credits: 75, // 60 + 15 bonus
    description: "Premium Pack - 75 Kredi (60 + 15 bonus)",
  },
  // Subscription products
  "com.yemekbulucu.subscription.basic.monthly": {
    credits: 0, // Subscription doesn't add credits, just enables features
    description: "Basic Monthly Subscription",
    isSubscription: true,
  },
};

serve(async (req) => {
  // CORS handling
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Debug logging
    console.log("REVENUECAT_WEBHOOK_SECRET exists:", !!revenuecatWebhookSecret);
    console.log("Authorization header:", req.headers.get("Authorization"));

    // Verify webhook signature (if configured)
    if (revenuecatWebhookSecret) {
      const signature = req.headers.get("Authorization");

      if (!signature) {
        console.error("No Authorization header found");
        return new Response("Unauthorized: No Authorization header", {
          status: 401,
        });
      }

      // Handle both "Bearer token" and just "token" formats
      let providedSecret = signature;
      if (signature.startsWith("Bearer ")) {
        providedSecret = signature.replace("Bearer ", "");
      }

      if (providedSecret !== revenuecatWebhookSecret) {
        console.error("Invalid webhook secret");
        return new Response("Unauthorized: Invalid secret", { status: 401 });
      }

      console.log("Authorization successful!");
    } else {
      console.log("No webhook secret configured, skipping authorization");
    }

    const webhookData: RevenueCatEvent = await req.json();
    console.log("Received RevenueCat webhook:", webhookData.event.type);

    const { event } = webhookData;
    const userId = event.app_user_id || event.original_app_user_id;

    if (!userId) {
      console.error("No user ID found in webhook data");
      return new Response("No user ID found", { status: 400 });
    }

    // Only process production events (ignore sandbox in production)
    if (
      event.environment === "SANDBOX" &&
      Deno.env.get("ENVIRONMENT") === "production"
    ) {
      console.log("Ignoring sandbox event in production");
      return new Response("Sandbox event ignored", { status: 200 });
    }

    // Process different event types
    switch (event.type) {
      case "INITIAL_PURCHASE":
      case "RENEWAL":
      case "NON_RENEWING_PURCHASE":
        await handlePurchase(userId, event);
        break;

      case "CANCELLATION":
      case "EXPIRATION":
        await handleCancellation(userId, event);
        break;

      case "UNCANCELLATION":
        await handleUncancellation(userId, event);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(
      JSON.stringify({ success: true, processed: event.type }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Webhook processing error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function handlePurchase(userId: string, event: any) {
  console.log(
    `Processing purchase for user ${userId}, product: ${event.product_id}`
  );

  const package_config =
    CREDIT_PACKAGES[event.product_id as keyof typeof CREDIT_PACKAGES];

  if (!package_config) {
    console.error(`Unknown product ID: ${event.product_id}`);
    return;
  }

  // Generate receipt ID for tracking
  const receiptId = `rc_${event.purchased_at_ms}_${userId.substring(0, 8)}`;

  try {
    // Handle subscription purchases differently
    if (package_config.isSubscription) {
      await handleSubscriptionPurchase(
        userId,
        event,
        package_config,
        receiptId
      );
    } else {
      // Handle credit purchases
      await handleCreditPurchase(userId, event, package_config, receiptId);
    }

    console.log(
      `Successfully processed purchase for user ${userId}, product: ${event.product_id}`
    );
  } catch (error) {
    console.error(`Failed to process purchase for user ${userId}:`, error);
    throw error;
  }
}

async function handleCreditPurchase(
  userId: string,
  event: any,
  package_config: any,
  receiptId: string
) {
  // First, get or create user credits record
  let { data: userCredits, error: fetchError } = await supabase
    .from("user_credits")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (fetchError && fetchError.code === "PGRST116") {
    // User credits record doesn't exist, create it
    const { data: newUserCredits, error: createError } = await supabase
      .from("user_credits")
      .insert({
        user_id: userId,
        total_credits: 0,
        used_credits: 0,
        remaining_credits: 0,
        daily_free_credits: 0, // No daily free credits anymore
        daily_free_used: 0,
        last_daily_reset: new Date().toISOString(),
        lifetime_credits_earned: 0,
        lifetime_credits_spent: 0,
      })
      .select()
      .single();

    if (createError) {
      throw createError;
    }
    userCredits = newUserCredits;
  } else if (fetchError) {
    throw fetchError;
  }

  // Add credits to user account
  const { error: updateError } = await supabase
    .from("user_credits")
    .update({
      total_credits: userCredits.total_credits + package_config.credits,
      remaining_credits: userCredits.remaining_credits + package_config.credits,
      lifetime_credits_earned:
        userCredits.lifetime_credits_earned + package_config.credits,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (updateError) {
    throw updateError;
  }

  // Create transaction record
  const { error: transactionError } = await supabase
    .from("credit_transactions")
    .insert({
      user_id: userId,
      transaction_type: "purchase",
      amount: package_config.credits,
      description: `RevenueCat Purchase: ${package_config.description}`,
      package_id: event.product_id,
      receipt_id: receiptId,
      related_action: "revenuecat_purchase",
    });

  if (transactionError) {
    throw transactionError;
  }

  console.log(
    `Successfully added ${package_config.credits} credits to user ${userId}`
  );
}

async function handleSubscriptionPurchase(
  userId: string,
  event: any,
  package_config: any,
  receiptId: string
) {
  // For subscriptions, we don't add credits but enable premium features
  // Create transaction record for tracking
  const { error: transactionError } = await supabase
    .from("credit_transactions")
    .insert({
      user_id: userId,
      transaction_type: "bonus", // Using bonus type for subscription tracking
      amount: 0,
      description: `RevenueCat Subscription: ${package_config.description}`,
      package_id: event.product_id,
      receipt_id: receiptId,
      related_action: "revenuecat_subscription",
    });

  if (transactionError) {
    throw transactionError;
  }

  console.log(
    `Successfully processed subscription purchase for user ${userId}`
  );
}

async function handleCancellation(userId: string, event: any) {
  console.log(`Processing cancellation for user ${userId}`);

  // Log the cancellation (you might want to handle subscription-specific logic here)
  const { error } = await supabase.from("credit_transactions").insert({
    user_id: userId,
    transaction_type: "bonus", // Using bonus type for logging purposes
    amount: 0,
    description: `Subscription cancelled: ${event.product_id}`,
    package_id: event.product_id,
    related_action: "revenuecat_cancellation",
  });

  if (error) {
    console.error("Failed to log cancellation:", error);
  }
}

async function handleUncancellation(userId: string, event: any) {
  console.log(`Processing uncancellation for user ${userId}`);

  // Log the uncancellation
  const { error } = await supabase.from("credit_transactions").insert({
    user_id: userId,
    transaction_type: "bonus",
    amount: 0,
    description: `Subscription reactivated: ${event.product_id}`,
    package_id: event.product_id,
    related_action: "revenuecat_uncancellation",
  });

  if (error) {
    console.error("Failed to log uncancellation:", error);
  }
}
