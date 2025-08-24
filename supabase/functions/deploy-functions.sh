#!/bin/bash

# Supabase Edge Functions Deployment Script
# Bu script'i çalıştırmadan önce Supabase CLI'nin yüklü olduğundan emin olun

echo "🚀 Deploying Supabase Edge Functions..."

# Login to Supabase (if not already logged in)
echo "📋 Checking Supabase login status..."
supabase status || {
    echo "❌ Supabase CLI not authenticated. Please run 'supabase login' first."
    exit 1
}

# Deploy OpenAI Proxy Function
echo "🤖 Deploying OpenAI Proxy Function..."
supabase functions deploy openai-proxy

if [ $? -eq 0 ]; then
    echo "✅ OpenAI Proxy Function deployed successfully"
else
    echo "❌ Failed to deploy OpenAI Proxy Function"
    exit 1
fi

# Deploy RevenueCat Webhook Function
echo "💰 Deploying RevenueCat Webhook Function..."
supabase functions deploy revenuecat-webhook

if [ $? -eq 0 ]; then
    echo "✅ RevenueCat Webhook Function deployed successfully"
else
    echo "❌ Failed to deploy RevenueCat Webhook Function"
    exit 1
fi

echo ""
echo "🎉 All Edge Functions deployed successfully!"
echo ""
echo "📝 Next steps:"
echo "1. Set environment variables in Supabase Dashboard:"
echo "   - OPENAI_API_KEY (for openai-proxy function)"
echo "   - REVENUECAT_WEBHOOK_SECRET (for revenuecat-webhook function)"
echo ""
echo "2. Configure RevenueCat webhook URL:"
echo "   https://your-project-id.supabase.co/functions/v1/revenuecat-webhook"
echo ""
echo "3. Test the functions with your app in development mode"