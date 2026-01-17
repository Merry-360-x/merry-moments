#!/bin/bash

# Brevo + Supabase Email Setup Script
# This script helps you configure SMTP for Supabase Auth emails

echo "🔧 Brevo SMTP Configuration for Supabase"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Step 1: Get Brevo SMTP Credentials${NC}"
echo "1. Visit: https://app.brevo.com/settings/keys/smtp"
echo "2. Copy your SMTP credentials"
echo ""
read -p "Press ENTER when you have your Brevo credentials ready..."

echo ""
echo -e "${YELLOW}Step 2: Enter your Brevo SMTP details${NC}"
echo ""

read -p "Brevo SMTP Email (login): " SMTP_USER
read -sp "Brevo SMTP Key (password): " SMTP_PASSWORD
echo ""
read -p "Sender Email (e.g., noreply@merry360x.com): " SENDER_EMAIL
read -p "Sender Name (e.g., Merry Moments): " SENDER_NAME

echo ""
echo "Configuration Summary:"
echo "======================"
echo "SMTP Host: smtp-relay.brevo.com"
echo "SMTP Port: 587"
echo "SMTP User: $SMTP_USER"
echo "SMTP Pass: [hidden]"
echo "Sender Email: $SENDER_EMAIL"
echo "Sender Name: $SENDER_NAME"
echo ""

read -p "Is this correct? (y/n): " confirm

if [ "$confirm" != "y" ]; then
    echo "Setup cancelled."
    exit 1
fi

echo ""
echo -e "${GREEN}✓ Configuration saved${NC}"
echo ""
echo -e "${YELLOW}Step 3: Configure in Supabase Dashboard${NC}"
echo ""
echo "Now you need to apply these settings in Supabase:"
echo ""
echo "1. Go to: https://supabase.com/dashboard/project/uwgiostcetoxotfnulfm"
echo "2. Navigate to: Settings → Auth → SMTP Settings"
echo "3. Enable 'Use custom SMTP server'"
echo "4. Fill in:"
echo "   - SMTP Host: smtp-relay.brevo.com"
echo "   - SMTP Port: 587"
echo "   - SMTP User: $SMTP_USER"
echo "   - SMTP Password: [your SMTP key]"
echo "   - Sender Email: $SENDER_EMAIL"
echo "   - Sender Name: $SENDER_NAME"
echo "5. Click 'Save'"
echo ""
echo -e "${YELLOW}Step 4: Update Email Templates${NC}"
echo ""
echo "1. Go to: Authentication → Email Templates"
echo "2. For 'Reset Password' template:"
echo "   - Copy from: email-templates/reset-password-email.html"
echo "   - Paste and Save"
echo ""
echo "3. For 'Confirm signup' template:"
echo "   - Copy from: email-templates/confirm-email.html"
echo "   - Paste and Save"
echo ""
echo -e "${GREEN}Setup instructions complete!${NC}"
echo ""
echo "After configuring in Supabase Dashboard, test by:"
echo "1. Visit: https://merry360x.com/forgot-password"
echo "2. Enter your email"
echo "3. Check your inbox"
echo ""
echo "See setup-brevo-smtp.md for detailed instructions."
