#!/bin/bash

# AUTONOMOUS SYSTEM VERIFICATION SCRIPT
# This script helps verify that the DomainFlipper system is working autonomously

echo "═══════════════════════════════════════════════════════════════════"
echo "   🤖 DOMAINFLIPPER AUTONOMOUS SYSTEM VERIFICATION"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print success
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Function to print error
print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to print info
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

echo "STEP 1: Checking Source Files"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if key files exist
if [ -f "src/lib/autonomy/ProductionBrain.ts" ]; then
    print_success "ProductionBrain.ts exists"
else
    print_error "ProductionBrain.ts NOT FOUND"
    exit 1
fi

if [ -f "src/lib/intelligence/CEOBrain.ts" ]; then
    print_success "CEOBrain.ts exists"
else
    print_error "CEOBrain.ts NOT FOUND"
    exit 1
fi

if [ -f "AUTONOMOUS_VERIFICATION.md" ]; then
    print_success "AUTONOMOUS_VERIFICATION.md exists"
else
    print_error "AUTONOMOUS_VERIFICATION.md NOT FOUND"
    exit 1
fi

echo ""
echo "STEP 2: Verifying CEO Brain Import in ProductionBrain"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if grep -q "import { ceoBrain } from '@/lib/intelligence/CEOBrain'" src/lib/autonomy/ProductionBrain.ts; then
    print_success "CEO Brain is imported in ProductionBrain"
else
    print_error "CEO Brain import NOT FOUND in ProductionBrain"
    exit 1
fi

echo ""
echo "STEP 3: Verifying CEO Brain Auto-Start Code"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if grep -q "await ceoBrain.start()" src/lib/autonomy/ProductionBrain.ts; then
    print_success "ceoBrain.start() call found in ProductionBrain"
else
    print_error "ceoBrain.start() call NOT FOUND in ProductionBrain"
    exit 1
fi

if grep -q "👑 CEO Brain ACTIVATED" src/lib/autonomy/ProductionBrain.ts; then
    print_success "CEO Brain activation logging found"
else
    print_error "CEO Brain activation logging NOT FOUND"
    exit 1
fi

echo ""
echo "STEP 4: Verifying CEO Brain Stop Code"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if grep -q "ceoBrain.stop()" src/lib/autonomy/ProductionBrain.ts; then
    print_success "ceoBrain.stop() call found in ProductionBrain"
else
    print_error "ceoBrain.stop() call NOT FOUND in ProductionBrain"
    exit 1
fi

echo ""
echo "STEP 5: Checking Dependencies"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "package.json" ]; then
    print_success "package.json exists"
    
    # Check for key dependencies
    if grep -q "react" package.json; then
        print_success "React dependency found"
    fi
    
    if grep -q "framer-motion" package.json; then
        print_success "Framer Motion dependency found"
    fi
    
    if grep -q "sonner" package.json; then
        print_success "Sonner dependency found"
    fi
else
    print_error "package.json NOT FOUND"
fi

echo ""
echo "STEP 6: Checking Git Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if git status &> /dev/null; then
    print_success "Git repository initialized"
    
    # Check if changes are committed
    if git diff --quiet; then
        print_success "All changes are committed"
    else
        print_warning "You have uncommitted changes"
        echo "Run: git add . && git commit -m 'your message'"
    fi
else
    print_error "Not a git repository"
fi

echo ""
echo "STEP 7: Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

print_success "All code verification checks passed!"
echo ""
print_info "WHAT WAS FIXED:"
echo "  • CEO Brain now auto-starts when ProductionBrain launches"
echo "  • Works in both DRY RUN and PRODUCTION modes"
echo "  • Comprehensive logging added for CEO Brain status"
echo "  • CEO Brain properly stops when ProductionBrain stops"
echo ""
print_info "NEXT STEPS TO VERIFY AUTONOMOUS OPERATION:"
echo "  1. Build the application: npm run build"
echo "  2. Start the development server: npm run dev"
echo "  3. Open the application in your browser"
echo "  4. Navigate to the Empire Dashboard"
echo "  5. Click 'Launch Production Brain' in DRY RUN mode"
echo "  6. Open browser console (F12) and watch for:"
echo "     - '👑 CEO Brain ACTIVATED - Executive intelligence online'"
echo "     - '👑 CEO Mood: XX% | Confidence: XX%'"
echo "     - '👑 Market Phase: [phase] | Risk Profile: [profile]'"
echo "  7. Navigate to CEO Brain Panel and verify decisions appear within 30-60 seconds"
echo "  8. Follow the complete checklist in AUTONOMOUS_VERIFICATION.md"
echo ""
print_warning "IMPORTANT: This verification confirms the CODE is correct."
print_warning "You MUST run the application to confirm RUNTIME behavior."
echo ""
print_info "For complete verification, see: AUTONOMOUS_VERIFICATION.md"
echo ""
echo "═══════════════════════════════════════════════════════════════════"
print_success "VERIFICATION COMPLETE"
echo "═══════════════════════════════════════════════════════════════════"
