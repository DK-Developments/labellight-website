# Website Template

A clean, minimal website template with a navbar and home page. Perfect for quickly starting new web projects.

## 📁 Project Structure 

```
Website Template/
├── src/
│   └── website/
│       ├── index.html      # Main home page
│       ├── navbar.html     # Navbar component (loaded dynamically)
│       ├── navbar.js       # Script to load navbar
│       ├── index.js        # Main JavaScript (includes smooth scrolling)
│       └── styles.css      # All styles for the website
├── terraform/              # Infrastructure as Code for AWS deployment
├── .github/workflows/      # CI/CD workflows for deployment
└── CSS_PRINCIPLES.md       # CSS design principles and guidelines
```

## 🚀 Local Development

Simply open `src/website/index.html` in your browser, or use a local development server:

```bash
# Python 3
cd src/website
python -m http.server 8000
```

Then visit `http://localhost:8000` in your browser.

## 🌐 Deployment

Deploy your website and updates automatically using AWS and Terraform

**Prerequisites**
   - AWS account
   - AWS CLI configured
   - Terraform installed

### 🔧 **Customize Terraform Configuration First**

Before deploying, you need to customize the Terraform files for your project. Look for `# CUSTOMIZE:` comments in these files:

**📄 `terraform/variables.tf`:**
- **`bucket_name`** (line 3) - Must be globally unique across all AWS
  - Example: `yourname-website-2024`, `mycompany-portfolio-prod`

**📄 `terraform/bootstrap/main.tf`:**
- **`bucket`** (line 15) - Terraform state bucket (globally unique)
  - Example: `yourname-terraform-state`
- **DynamoDB `name`** (line 46) - State lock table name
  - Example: `yourname-terraform-locks`

**📄 `terraform/main.tf`:**
- **Backend config** (lines 3-6) - Must match your bootstrap names exactly

**⚠️ Important**: 
- S3 bucket names must be globally unique
- Bucket names in `main.tf` backend must match `bootstrap/main.tf` outputs

---

### 📋 **Deployment Steps**

1. **Setup AWS Credentials**
   
   You need to create an AWS IAM user with programmatic access for deployment.
   
   **Steps to create AWS credentials:**
   1. Log into the **AWS Console**
   2. Navigate to **IAM** (Identity and Access Management)
   3. Click **Users** in the left sidebar
   4. Click **Create user** (or select an existing user)
   5. Enter a username (e.g., `github-actions-bot`)
   6. Click **Next**
   7. **Attach policies directly** and add these permissions:
      - `AmazonS3FullAccess`
      - `CloudFrontFullAccess`
      - `AmazonDynamoDBFullAccess`
      - `AmazonAPIGatewayAdministrator`
      - `IAMFullAccess`
   8. Click **Next** → **Create user**
   9. Select the user → **Security credentials** tab
   10. Click **Create access key**
   11. Select **Application running outside AWS** → **Next**
   12. Add a description (e.g., "GitHub Actions deployment") → **Create access key**
   13. **IMPORTANT**: Copy both the **Access Key ID** and **Secret Access Key** immediately (you won't be able to see the secret again!)
   
   Example credentials format:
   - Access Key ID: `AKIAIOSFODNN7EXAMPLE`
   - Secret Access Key: `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`

2. **Setup GitHub Secrets**
   
   GitHub Secrets securely store your AWS credentials for the deployment workflow.
   
   **How to add secrets:**
   1. Go to your **GitHub repository**
   2. Click on **Settings** (top navigation)
   3. In the left sidebar, click **Secrets and variables** → **Actions**
   4. Click **New repository secret**
   5. Add the first secret:
      - **Name**: `AWS_ACCESS_KEY_ID`
      - **Value**: Paste your AWS Access Key ID from step 2
   6. Click **Add secret**
   7. Click **New repository secret** again
   8. Add the second secret:
      - **Name**: `AWS_SECRET_ACCESS_KEY`
      - **Value**: Paste your AWS Secret Access Key from step 2
   9. Click **Add secret**
   
   You should now see both secrets listed (values will be hidden for security).

3. **Bootstrap (First Time Only)**
   - Go to your repository's **Actions** tab
   - Select **Bootstrap Terraform State Backend** workflow
   - Click **Run workflow** → **Run workflow**
   - Wait for it to complete (creates S3 bucket and DynamoDB table for Terraform state)

4. **Deploy Your Website**
   - **Option A (Automatic)**: Push to `main` branch - triggers deployment automatically
   - **Option B (Manual)**: Go to **Actions** → **Deploy to AWS** → **Run workflow**
   - Your site will be deployed to CloudFront + S3
   - The deployment URL will be shown in the workflow output


## 🎯 Next Steps

1. Update `index.html` with your content
2. Customize colors in `styles.css`
3. Add your own pages

## 📄 License

Feel free to use this template for any project!

