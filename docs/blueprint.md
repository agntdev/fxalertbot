# Forex Price Alerts — Bot specification

**Archetype:** custom

**Voice:** professional and concise — write every user-facing message, button label, error, and empty state in this voice.

A private Telegram bot that allows users to create and manage forex price alerts. Users set thresholds for currency pairs, and receive private notifications when market prices cross those thresholds. Alerts are persistent and private to each user.

> This is the complete contract for the bot. Implement EVERY entry point, flow, feature, integration, and edge case below. The completeness review checks the bot against this document after each build pass.

## Primary audience

- Retail traders
- Forex enthusiasts
- Individual investors

## Success criteria

- Users receive accurate price alerts in their private Telegram messages
- Alerts persist across bot restarts and are reliably evaluated
- Users can manage their alerts (add, edit, pause, resume, delete) through a clear interface

## Entry points

Every feature must be reachable from the bot's command/button surface (button-first; only /start and /help are slash commands).

- **/start** (command, actor: user, command: /start) — Open the main menu and onboarding flow
- **/add** (command, actor: user, command: /add) — Start the flow to create a new price alert
- **/list** (command, actor: user, command: /list) — Show a list of active alerts with management options
- **/help** (command, actor: user, command: /help) — Display available commands and examples

## Flows

### Onboarding
_Trigger:_ /start

1. Greet user
2. Explain commands
3. Optionally request timezone preference

_Data touched:_ User

### Create Alert
_Trigger:_ /add

1. Request currency pair
2. Request direction (above/below)
3. Request target price
4. Confirm alert details
5. Generate and return alert ID

_Data touched:_ Alert

### List Alerts
_Trigger:_ /list

1. Display active alerts with IDs, pair, direction, target price, status
2. Show inline buttons for management actions (pause, resume, edit, delete)

_Data touched:_ Alert

### Manage Alert
_Trigger:_ inline button click

1. Process selected management action
2. Update alert status or properties
3. Confirm change to user

_Data touched:_ Alert

### Price Alert Notification
_Trigger:_ Price threshold crossed

1. Send private message with pair, direction, target price, current price, timestamp, and alert ID
2. Mark alert as inactive unless configured for repeats

_Data touched:_ Alert, Notification event

## Data entities

Durable data (must survive a restart) uses the toolkit's persistent store, never in-memory maps.

- **User** _(retention: persistent)_ — Telegram user account information and preferences
  - fields: Telegram user ID, timezone, preferences
- **Alert** _(retention: persistent)_ — User-created price alert configuration
  - fields: user ID owner, currency pair, direction, target price, created_at, active/paused status, repeating flag, expiration rule
- **Notification event** _(retention: persistent)_ — Record of when an alert was triggered
  - fields: alert ID, triggered_at, price_at_trigger

## Integrations

- **Telegram** (required) — Bot API messaging and user management
- **Market Data Feed** (required) — Forex price data source
Call external APIs against their real contract (correct endpoints, ids, params); credentials from env. Do not fake responses.

## Owner controls

- Configure price polling interval
- Select market data source
- Set maximum number of alerts per user
- Configure alert expiration rules

## Notifications

- Private Telegram messages when price thresholds are crossed
- Confirmation messages for alert creation and management actions

## Permissions & privacy

- User data is private and not shared with other users
- Alerts are private to the user who created them
- Telegram user ID is used for identification without requiring additional personal information

## Edge cases

- Invalid currency pair formats
- Price data source unavailability
- User tries to manage non-existent alert
- Multiple alerts for the same currency pair and direction
- Timezone conversion errors

## Required tests

- End-to-end alert creation and triggering flow
- Alert management (pause, resume, edit, delete) functionality
- Notification delivery accuracy and formatting
- Persistence of user data across bot restarts
- Error handling for invalid inputs and edge cases

## Assumptions

- Users are identified by their Telegram user ID
- Default timezone is UTC unless specified by user
- Currency pairs follow standard six-character format
- Alerts are single-trigger by default
- Price data source is reliable and up-to-date
