-- ============================================================================
-- CAIRN — Demo Seed Data
-- Run this in Supabase SQL Editor to populate the app for demo/presentation.
-- Replace USER_ID with your actual users.id from the users table.
-- ============================================================================

-- Step 1: Find your user ID
-- SELECT id, supabase_auth_id, academic_stage FROM users;
-- Copy the id value and replace 'YOUR_USER_ID' below

-- Step 2: Update user profile to look lived-in
-- UPDATE users SET
--   journal_streak = 5,
--   current_persona = 'ground',
--   current_stress_level = 6,
--   persona_confidence = 0.82,
--   circles_joined = 2,
--   burdens_dropped = 4,
--   memories_saved = 1,
--   academic_stage = 'in_the_middle',
--   primary_burden = 'career',
--   cultural_context = 'south_asian',
--   age_group = 'early_career',
--   occupation = 'engineer',
--   living_situation = 'alone'
-- WHERE id = 'YOUR_USER_ID';

-- Step 3: Add journal entries (shows on home page + profile)
-- INSERT INTO journal_entries (user_id, input_type, raw_transcript, assigned_persona, persona_confidence, stress_level, burden_themes, recognition_message, micro_intervention, ai_model_used, ai_processing_ms, created_at) VALUES
-- ('YOUR_USER_ID', 'audio', 'I sat down to work today and just couldn''t focus. The deadline is Thursday and I haven''t even started the main section. I keep thinking about what my parents would say if they knew.', 'storm', 0.87, 8, ARRAY['career', 'family'], 'The weight of two worlds — your own ambitions and the ones carried for you. That''s not weakness. That''s carrying more than most people can see.', 'Close your laptop. Set a timer for 5 minutes. Breathe. Then write down just the first step — not the whole plan.', 'gemini-persona-pipeline', 2340, NOW() - INTERVAL '4 hours'),
-- ('YOUR_USER_ID', 'text', 'Better day today. Went for a walk and called home. Mom asked about my job and for once I didn''t feel the weight of it. Maybe I''m learning to hold both.', 'ground', 0.79, 4, ARRAY['family', 'belonging'], 'That phone call? That was you finding ground between two worlds. Not choosing one — holding both. That takes more strength than anyone gives credit for.', 'Write down one thing that went well today. Put it somewhere you''ll see tomorrow.', 'gemini-persona-pipeline', 1890, NOW() - INTERVAL '1 day'),
-- ('YOUR_USER_ID', 'audio', 'I just need to say this somewhere. The visa situation is making everything feel temporary. Like I can''t fully invest in anything because it might all disappear.', 'storm', 0.91, 8, ARRAY['career', 'belonging'], 'The uncertainty of building a life on borrowed time — 247 people in this community know that exact feeling. You''re not imagining how heavy this is.', 'Name three things that are yours regardless of status: a skill, a relationship, a memory. Those are permanent.', 'gemini-persona-pipeline', 2100, NOW() - INTERVAL '2 days'),
-- ('YOUR_USER_ID', 'text', 'Helped someone in my circle today who was going through the same visa anxiety I had last month. Felt like the first time my experience was useful instead of just painful.', 'through_it', 0.85, 3, ARRAY['belonging'], 'Look at that — your storm became someone else''s shelter. That''s not just recovery. That''s purpose.', 'Remember this feeling. Bookmark it in your mind. On heavy days, this is proof that it gets better.', 'gemini-persona-pipeline', 1950, NOW() - INTERVAL '3 days'),
-- ('YOUR_USER_ID', 'audio', 'Another interview rejection. I know I should be used to it by now but each one feels like a referendum on whether I belong here at all.', 'storm', 0.88, 7, ARRAY['career'], 'Every rejection lands differently when you''re carrying the weight of proving you belong. 312 people in this community got that same email this month. You''re not the rejection — you''re the persistence.', 'Unfollow one career advice account today. Replace it with something that makes you laugh.', 'gemini-persona-pipeline', 2200, NOW() - INTERVAL '4 days');

-- Step 4: Add persona history (shows on profile 30-day arc)
-- INSERT INTO user_persona_history (user_id, persona, stress_level, recorded_at) VALUES
-- ('YOUR_USER_ID', 'storm', 8, NOW() - INTERVAL '7 days'),
-- ('YOUR_USER_ID', 'storm', 7, NOW() - INTERVAL '6 days'),
-- ('YOUR_USER_ID', 'ground', 6, NOW() - INTERVAL '5 days'),
-- ('YOUR_USER_ID', 'storm', 8, NOW() - INTERVAL '4 days'),
-- ('YOUR_USER_ID', 'ground', 5, NOW() - INTERVAL '3 days'),
-- ('YOUR_USER_ID', 'through_it', 3, NOW() - INTERVAL '2 days'),
-- ('YOUR_USER_ID', 'ground', 4, NOW() - INTERVAL '1 day'),
-- ('YOUR_USER_ID', 'ground', 6, NOW());

-- Step 5: Add burden drops (shows on profile)
-- INSERT INTO burden_drops (user_id, raw_burden_text, extracted_theme, theme_confidence, created_at) VALUES
-- ('YOUR_USER_ID', 'The distance between where I am and where everyone expects me to be by 25', 'family_expectation_gap', 0.85, NOW() - INTERVAL '3 days'),
-- ('YOUR_USER_ID', 'Tired of pretending the visa situation doesn''t affect every decision I make', 'visa_career_intersection_anxiety', 0.92, NOW() - INTERVAL '2 days'),
-- ('YOUR_USER_ID', 'Another week of saying I''m fine when I''m not', 'performance_of_okayness', 0.78, NOW() - INTERVAL '1 day'),
-- ('YOUR_USER_ID', 'The rejection emails blur together but each one still cuts', 'job_search_rejection', 0.88, NOW() - INTERVAL '5 hours');

-- Step 6: Add more seed memories to the Memory Wall
INSERT INTO memories (source_type, quote_text, burden_tag, cultural_tag, is_approved, helped_count, ai_safety_score) VALUES
('user_submitted', 'I stopped waiting for permission to feel at home. Home is wherever I decide to build.', 'belonging_nowhere', 'south_asian', true, 156, 0.95),
('user_submitted', 'The hardest part isn''t the work — it''s pretending the work is the hardest part.', 'burnout_silent', 'universal', true, 289, 0.92),
('user_submitted', 'My parents didn''t cross an ocean so I could be comfortable. But they also didn''t cross it so I could be this tired.', 'parental_sacrifice_guilt', 'south_asian', true, 341, 0.94),
('user_submitted', 'I thought being strong meant carrying it all. Turns out strength is putting some of it down.', 'performance_of_okayness', 'universal', true, 267, 0.96),
('user_submitted', 'The 3am version of me is more honest than the 9am version. This app is where 3am me gets to speak.', 'loneliness_in_success', 'international', true, 198, 0.91),
('seed', 'Someone told me: "You don''t have to earn your place here. You already have one." I think about that every day.', 'belonging_nowhere', 'universal', true, 412, 0.97),
('user_submitted', 'Found my circle on a Tuesday at midnight. Four strangers who knew exactly what H1B anxiety tastes like.', 'visa_career_intersection_anxiety', 'south_asian', true, 223, 0.93);
