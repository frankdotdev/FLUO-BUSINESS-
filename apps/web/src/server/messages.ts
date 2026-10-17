// Stable service error codes -> plain-language messages shown to people.
const M: Record<string, string> = {
  forbidden: "You don't have permission to do that.", not_found: "We couldn't find that.", invalid_name: "Please enter a valid name.", invalid_contact: "Please enter your name and a valid email address.",
  invalid_price: "Please enter a valid price.", invalid_account_number: "Account numbers have 10 digits.", listing_limit_reached: "You've reached the listing limit on your current plan.",
  business_unavailable: "This business isn't taking orders right now.", unavailable_product: "That item isn't available.", invalid_quantity: "Please choose a valid quantity.",
  method_not_allowed: "That payment method isn't available for this business.", transfer_account_missing: "This business hasn't set up bank transfers yet.", payments_unavailable: "Online payment isn't available for this business.",
  lead_time_not_met: "That date is too soon for this item. Please pick a later date.", required_by_needed: "Please choose the date you need it.", fully_booked: "Sorry, that time is fully booked.",
  transfer_expired: "This payment window has expired. Please place the order again.", invalid_state: "That can't be done in the current state.", payment_pending_confirmation: "You've said you've paid. The business will confirm shortly.",
  not_cancellable: "This can no longer be cancelled.", already_started: "It has already started, so it can't be cancelled.", verification_required: "This kind of business needs verification before it can go live.",
  payment_mode_required: "Choose at least one way for customers to pay.", payout_not_verified: "Verify your payout account first.", transfer_account_required: "Add your bank account for transfers first.",
  at_least_one_mode_required: "Keep at least one payment method on.", capability_not_enabled: "That feature isn't enabled for this business.", invalid_account: "Please enter the account details.",
  order_limit_reached: "This business has reached its monthly order limit. Please try again next month or contact them.", rate_limited: "Too many attempts. Please wait a minute and try again.",
  invalid_date: "Please check the dates and times you entered.", event_must_be_in_future: "The event must start in the future.", invalid_end_time: "The end time must be after the start.",
  invalid_capacity: "Capacity must be between 1 and 100,000.", no_ticket_types: "Add at least one ticket type before publishing.", invalid_units: "List each room, court or person once.", invalid_rules: "Check the booking rules you entered.",
  event_unavailable: "These tickets aren't available.", event_closed: "This event is closed.", sales_not_started: "Ticket sales haven't started.", sales_ended: "Ticket sales have ended.", too_short: "That's shorter than the minimum booking.",
  too_long: "That's longer than the maximum booking.", not_aligned: "Please choose one of the available start times.", too_soon: "That's too soon. Please choose a later time.", too_far: "That's too far ahead.", invalid_interval: "Please check the dates and times you entered.",
  unavailable: "That isn't available.", invalid_holder: "Please enter a name and valid email for each ticket.", sales_must_end_before_event: "Ticket sales must end before the event starts.",
  out_of_stock: "Sorry, there isn't enough stock for that.", invalid_stock: "Stock must be a whole number, or leave it empty.", empty_message: "Please type a message.", message_too_long: "That message is too long (2000 characters at most).",
  cannot_message_own_business: "That's your own business.", seat_limit_reached: "Your plan's team size limit is reached. Upgrade to add more people.", invalid_role: "Choose a valid role.", invalid_email: "Please enter a valid email address.", cannot_remove_owner: "The owner can't be removed.",
  plan_not_available: "That plan isn't available.", no_active_subscription: "There's no active plan to change.", hold_expired: "The hold on this has expired.", sold_out: "Sorry, this is sold out.",
};
export const friendly = (code: string | undefined): string | null => (code ? (M[code] ?? "Something went wrong. Please try again.") : null);
