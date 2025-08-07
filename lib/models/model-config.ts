import { LLM } from "@/types"
import {
  RESTRICT_MODELS,
  YOUR_CONFIGURED_PROVIDERS,
  ALLOWED_MODELS
} from "./your-model-config"

// Configuration for which models to allow
// Set this to true if you want to restrict models to only what you have configured
export const RESTRICT_MODELS_TO_CONFIGURED_PROVIDERS = RESTRICT_MODELS

// If restricting models, specify which providers you have configured
// Only models from these providers will be available
export const ALLOWED_PROVIDERS = YOUR_CONFIGURED_PROVIDERS

// If you want to allow specific models regardless of provider, add them here
export const ALLOWED_MODELS_LIST = ALLOWED_MODELS

// Function to check if a model should be available
export const isModelAllowed = (model: LLM): boolean => {
  // If not restricting, allow all models
  if (!RESTRICT_MODELS_TO_CONFIGURED_PROVIDERS) {
    return true
  }

  // Check if the model's provider is in the allowed list
  const isProviderAllowed = ALLOWED_PROVIDERS.includes(model.provider)

  // Check if the specific model is in the allowed list
  const isModelInAllowedList = ALLOWED_MODELS_LIST.includes(model.modelId)

  // Allow if either condition is met
  return isProviderAllowed || isModelInAllowedList
}
