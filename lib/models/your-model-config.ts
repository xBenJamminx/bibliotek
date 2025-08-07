// ============================================================================
// MODEL CONFIGURATION - CUSTOMIZE THIS FILE
// ============================================================================

// Set to true to restrict models to only what you have configured
// Set to false to allow all models (users can add their own API keys)
export const RESTRICT_MODELS = true

// List the providers you have configured with API keys
// Only models from these providers will be available when RESTRICT_MODELS is true
export const YOUR_CONFIGURED_PROVIDERS = [
  "openai"
  // Add other providers you have configured:
  // "anthropic", "google", "mistral", "groq", "perplexity", "azure"
]

// List specific models you want to allow regardless of provider
// This is useful if you want to allow certain models even if you don't have that provider configured
export const ALLOWED_MODELS = [
  "gpt-4o-mini",
  "gpt-4o",
  "gpt-4-turbo-preview",
  "gpt-3.5-turbo"
  // Add other specific model IDs you want to allow
]

// ============================================================================
// HOW TO USE:
// ============================================================================
// 1. Set RESTRICT_MODELS to true to limit available models
// 2. Add your configured providers to YOUR_CONFIGURED_PROVIDERS
// 3. Add any specific models you want to allow to ALLOWED_MODELS
// 4. Users can still add their own API keys in the app settings
// 5. When users add their own API keys, they get access to all models from that provider
