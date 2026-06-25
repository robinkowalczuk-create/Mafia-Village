-- ================================================================
-- MAFIA VILLAGE — Schéma Supabase complet
-- À exécuter dans : Supabase Dashboard > SQL Editor > New Query
-- ================================================================

-- ── games ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS games (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                  TEXT NOT NULL UNIQUE,
  status                TEXT NOT NULL DEFAULT 'lobby'
                        CHECK (status IN ('lobby','in_progress','finished')),
  current_phase         TEXT NOT NULL DEFAULT 'lobby'
                        CHECK (current_phase IN (
                          'lobby','role_reveal','thief_turn','cupid_turn',
                          'night','night_resolution','day','vote',
                          'elimination','hunter_shot','victory'
                        )),
  phase_number          INT NOT NULL DEFAULT 0,
  winner_camp           TEXT CHECK (winner_camp IN ('village','werewolves','lovers')),
  night_kills           UUID[] DEFAULT '{}',
  eliminated_player_id  UUID,
  hunter_target_id      UUID,
  vote_tie              BOOLEAN DEFAULT FALSE,
  vote_started_at       TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ── players ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS players (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id              UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,
  role                 TEXT CHECK (role IN (
                         'villager','werewolf','seer','witch','hunter',
                         'cupid','littlegirl','thief','idiot','bodyguard'
                       )),
  is_alive             BOOLEAN NOT NULL DEFAULT TRUE,
  is_mj                BOOLEAN NOT NULL DEFAULT FALSE,
  is_lover             BOOLEAN DEFAULT FALSE,
  role_seen            BOOLEAN DEFAULT FALSE,
  -- Sorcière
  witch_heal_used      BOOLEAN DEFAULT FALSE,
  witch_poison_used    BOOLEAN DEFAULT FALSE,
  -- Chasseur
  hunter_shot_used     BOOLEAN DEFAULT FALSE,
  -- Idiot du Village
  idiot_voted_out      BOOLEAN DEFAULT FALSE,
  joined_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ── actions ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS actions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id      UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id    UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  action_type  TEXT NOT NULL CHECK (action_type IN (
                 'werewolf_kill','seer_inspect',
                 'witch_heal','witch_poison',
                 'hunter_shoot','cupid_link',
                 'bodyguard_protect','thief_steal','spy'
               )),
  target_id    UUID REFERENCES players(id) ON DELETE SET NULL,
  phase_number INT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (game_id, player_id, action_type, phase_number)
);

-- ── votes ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS votes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id      UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  voter_id     UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  target_id    UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  phase_number INT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (game_id, voter_id, phase_number)
);

-- ================================================================
-- ROW LEVEL SECURITY (RLS)
-- Pas d'authentification utilisateur → accès public contrôlé
-- ================================================================

ALTER TABLE games   ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes   ENABLE ROW LEVEL SECURITY;

-- games
CREATE POLICY "games_select" ON games FOR SELECT USING (true);
CREATE POLICY "games_insert" ON games FOR INSERT WITH CHECK (true);
CREATE POLICY "games_update" ON games FOR UPDATE USING (true);

-- players
CREATE POLICY "players_select" ON players FOR SELECT USING (true);
CREATE POLICY "players_insert" ON players FOR INSERT WITH CHECK (true);
CREATE POLICY "players_update" ON players FOR UPDATE USING (true);

-- actions
CREATE POLICY "actions_select" ON actions FOR SELECT USING (true);
CREATE POLICY "actions_insert" ON actions FOR INSERT WITH CHECK (true);
CREATE POLICY "actions_upsert" ON actions FOR UPDATE USING (true);

-- votes
CREATE POLICY "votes_select" ON votes FOR SELECT USING (true);
CREATE POLICY "votes_insert" ON votes FOR INSERT WITH CHECK (true);
CREATE POLICY "votes_update" ON votes FOR UPDATE USING (true);
CREATE POLICY "votes_delete" ON votes FOR DELETE USING (true);

-- ================================================================
-- REALTIME — activer la diffusion sur toutes les tables
-- ================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE games;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE actions;
ALTER PUBLICATION supabase_realtime ADD TABLE votes;

-- ================================================================
-- INDEX — performance sur les jointures fréquentes
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_players_game_id  ON players(game_id);
CREATE INDEX IF NOT EXISTS idx_actions_game_id  ON actions(game_id);
CREATE INDEX IF NOT EXISTS idx_votes_game_id    ON votes(game_id);
CREATE INDEX IF NOT EXISTS idx_games_code       ON games(code);
CREATE INDEX IF NOT EXISTS idx_players_alive    ON players(game_id, is_alive);
