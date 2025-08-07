-- Fix missing trigger and create missing profile/workspace data

-- Recreate the trigger that creates profile and workspace on user signup
DROP TRIGGER IF EXISTS create_profile_and_workspace_trigger ON auth.users;
CREATE TRIGGER create_profile_and_workspace_trigger
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE PROCEDURE public.create_profile_and_workspace();

-- Create missing profile and workspace for existing user(s) who don't have them
DO $$
DECLARE
    user_record RECORD;
    random_username TEXT;
BEGIN
    -- Loop through users who don't have profiles
    FOR user_record IN 
        SELECT au.id 
        FROM auth.users au 
        LEFT JOIN profiles p ON au.id = p.user_id 
        WHERE p.user_id IS NULL
    LOOP
        -- Generate a random username for this user
        random_username := 'user' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 16);
        
        -- Create profile for this user
        INSERT INTO public.profiles(
            user_id, anthropic_api_key, azure_openai_35_turbo_id, azure_openai_45_turbo_id, 
            azure_openai_45_vision_id, azure_openai_api_key, azure_openai_endpoint, 
            google_gemini_api_key, has_onboarded, image_url, image_path, mistral_api_key, 
            display_name, bio, openai_api_key, openai_organization_id, perplexity_api_key, 
            profile_context, use_azure_openai, username
        )
        VALUES(
            user_record.id, '', '', '', '', '', '', '', FALSE, '', '', '', '', '', 
            '', '', '', '', FALSE, random_username
        );

        -- Create home workspace for this user
        INSERT INTO public.workspaces(
            user_id, is_home, name, default_context_length, default_model, 
            default_prompt, default_temperature, description, embeddings_provider, 
            include_profile_context, include_workspace_instructions, instructions
        )
        VALUES(
            user_record.id, TRUE, 'Home', 4096, 'gpt-4-1106-preview',
            'You are a friendly, helpful AI assistant.', 0.5, 'My home workspace.',
            'openai', TRUE, TRUE, ''
        );
    END LOOP;
END $$;
