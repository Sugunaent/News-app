CREATE UNIQUE INDEX xp_rules_one_active_rule_per_event
    ON public.xp_rules (event_type)
    WHERE is_active = TRUE;
