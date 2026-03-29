-- Cairn migration: through_it_letters
-- "Someone Left This For You" — letters from people who made it through.
-- Date: 2026-03-29

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) through_it_letters table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS through_it_letters (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id uuid REFERENCES users(id) ON DELETE SET NULL,
    burden_theme text NOT NULL,
    cultural_tag text DEFAULT 'universal',
    content text NOT NULL,
    helped_count integer NOT NULL DEFAULT 0,
    is_approved boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_through_it_letters_theme
    ON through_it_letters(burden_theme, cultural_tag);

CREATE INDEX IF NOT EXISTS idx_through_it_letters_approved
    ON through_it_letters(is_approved)
    WHERE is_approved = true;

-- ---------------------------------------------------------------------------
-- 2) RLS
-- ---------------------------------------------------------------------------
ALTER TABLE through_it_letters ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read approved letters
CREATE POLICY "anyone_can_read_approved_letters"
    ON through_it_letters FOR SELECT
    USING (is_approved = true);

-- Service role (backend) bypasses RLS automatically.
-- Admin UI policies deferred — not needed for launch.

-- ---------------------------------------------------------------------------
-- 3) Seed data — 5 hand-written letters (these ARE the product)
-- ---------------------------------------------------------------------------
INSERT INTO through_it_letters (burden_theme, cultural_tag, content) VALUES
(
    'job_search_rejection',
    'nepali',
    'I kept count because I needed to know the number was not infinite. Mine was 31. Number 32 was the one. The gap between those two numbers felt like it would last forever. It did not. The fact that you are still counting means you have not stopped. That is everything.'
),
(
    'visa_career_intersection_anxiety',
    'south_asian',
    'There was a week where I had three rejections, a visa deadline, and a call home where I told my parents everything was fine. I do not know how I said it with a straight voice. I want you to know that the weight you are carrying right now is real. It is also not permanent. I am on the other side of it and I am okay.'
),
(
    'family_expectation_gap',
    'nepali',
    'I stopped performing okayness for one phone call home. Just told my mom I was tired. She said me too. That was the beginning of something I do not have words for yet. You do not have to tell them everything. You can start with one true thing.'
),
(
    'belonging_nowhere',
    'nepali',
    'I gave myself permission to grieve the version of me I left behind when I moved. She was real. This version is real too. Both can exist. You are not incomplete because you fit nowhere perfectly. You are someone who has lived in more than one world.'
),
(
    'performance_of_okayness',
    'south_asian',
    'The timeline everyone else seemed to be on was invisible to me. I could feel it but never see it. What I know now is that I was never actually behind it. I just thought I was because I was measuring myself against something that was not measuring me back.'
),
(
    'invisible_debt',
    'nepali',
    'My mother worked two jobs so I could sit in a lecture hall. I carried that like a stone in my chest for three years. One day I realized the stone was not guilt — it was love with nowhere to go. I started writing her letters I never sent. The stone did not disappear but it got warm.'
),
(
    'impostor_syndrome_professional',
    'south_asian',
    'I sat in a meeting once and thought: they are going to find out I do not belong here. Then I looked around and realized half the room was thinking the same thing. The fraud feeling is not evidence. It is just fear wearing a suit.'
),
(
    'burnout_silent',
    'universal',
    'I thought rest was something I had to earn. So I kept going until my body stopped for me. The thing nobody tells you is that collapse is not failure — it is your body keeping a promise you refused to keep yourself. Rest before you have to.'
);

COMMIT;
