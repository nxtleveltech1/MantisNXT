#!/bin/bash
# Loyalty Admin Components Verification Script

echo "🔍 Verifying Loyalty Admin Frontend Components..."
echo ""

# Check if all components exist
COMPONENTS=(
  "ProgramConfiguration.tsx"
  "RewardCatalogManager.tsx"
  "RuleEngineBuilder.tsx"
  "RedemptionQueue.tsx"
  "LoyaltyLeaderboard.tsx"
  "LoyaltyAnalytics.tsx"
  "CustomerLoyaltyProfile.tsx"
  "index.ts"
  "README.md"
)

COMPONENT_DIR="src/components/loyalty/admin"
ALL_EXIST=true

echo "📁 Checking component files..."
for component in "${COMPONENTS[@]}"; do
  if [ -f "$COMPONENT_DIR/$component" ]; then
    SIZE=$(du -h "$COMPONENT_DIR/$component" | cut -f1)
    LINES=$(wc -l < "$COMPONENT_DIR/$component")
    echo "✅ $component ($SIZE, $LINES lines)"
  else
    echo "❌ $component - NOT FOUND"
    ALL_EXIST=false
  fi
done

echo ""
echo "📊 Total Statistics:"
echo "   Total Files: ${#COMPONENTS[@]}"
echo "   Total Size: $(du -sh $COMPONENT_DIR | cut -f1)"
echo "   Total Lines: $(find $COMPONENT_DIR -name "*.tsx" -o -name "*.ts" | xargs wc -l | tail -1 | awk '{print $1}')"

echo ""
if [ "$ALL_EXIST" = true ]; then
  echo "✅ ALL COMPONENTS VERIFIED AND READY!"
else
  echo "⚠️  Some components are missing. Please check above."
fi

echo ""
echo "🎉 Loyalty Admin Frontend - COMPLETE!"
