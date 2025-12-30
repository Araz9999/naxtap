# Prisma Migration Script
# This script creates a migration without applying it (for development safety)

echo "Creating Prisma migration..."
cd /workspace
npx prisma migrate dev --name add_listings_and_stores --create-only

echo ""
echo "✅ Migration created successfully!"
echo ""
echo "To apply the migration, run:"
echo "  npx prisma migrate dev"
echo ""
echo "Or to deploy on production:"
echo "  npx prisma migrate deploy"
