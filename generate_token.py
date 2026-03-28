from supabase import create_client
from dotenv import load_dotenv
import os

load_dotenv()

supabase = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_ROLE_KEY"]
)

TEST_EMAIL = "test@cairn.dev"
TEST_PASSWORD = "testpass123"

# Step 1: Create the test user (only needed once)
try:
    supabase.auth.admin.create_user({
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD,
        "email_confirm": True  # skip email verification
    })
    print("Test user created")
except Exception as e:
    print(f"User may already exist: {e}")

# Step 2: Sign in and get the JWT
response = supabase.auth.sign_in_with_password({
    "email": TEST_EMAIL,
    "password": TEST_PASSWORD
})

token = response.session.access_token
print("\n✅ Your Bearer token:")
print(f"\nBearer {token}\n")
print("Copy the full line above into Swagger Authorize")