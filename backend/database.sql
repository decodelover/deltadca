DROP TABLE IF EXISTS saved_simulations CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE saved_simulations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    coin_id VARCHAR(100) NOT NULL,
    investment_amount NUMERIC NOT NULL CHECK (investment_amount > 0),
    frequency VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_invested NUMERIC NOT NULL CHECK (total_invested >= 0),
    final_portfolio_value NUMERIC NOT NULL CHECK (final_portfolio_value >= 0),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_saved_simulations_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_saved_simulations_date_range
        CHECK (end_date >= start_date)
);

CREATE INDEX idx_saved_simulations_user_created_at
    ON saved_simulations (user_id, created_at DESC);

CREATE INDEX idx_saved_simulations_coin_id
    ON saved_simulations (coin_id);
