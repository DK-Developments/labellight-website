DISPLAY_NAME_MIN_LENGTH = 2
DISPLAY_NAME_MAX_LENGTH = 20
BIO_MAX_LENGTH = 500


def validate_display_name(display_name):
    if not display_name or not display_name.strip():
        return (False, 'display_name is required')
    
    name = display_name.strip()
    
    if len(name) < DISPLAY_NAME_MIN_LENGTH:
        return (False, f'display_name must be at least {DISPLAY_NAME_MIN_LENGTH} characters')
    
    if len(name) > DISPLAY_NAME_MAX_LENGTH:
        return (False, f'display_name must not exceed {DISPLAY_NAME_MAX_LENGTH} characters')
    
    return (True, None)


def validate_bio(bio):
    if bio is None:
        return (True, None)
    
    if len(bio) > BIO_MAX_LENGTH:
        return (False, f'bio must not exceed {BIO_MAX_LENGTH} characters')
    
    return (True, None)


def validate_profile_data(display_name, bio=None, for_update=False):
    if for_update and not display_name:
        pass  # Skip display_name validation if empty during update
    else:
        is_valid, error = validate_display_name(display_name)
        if not is_valid:
            return (is_valid, error)
    
    is_valid, error = validate_bio(bio)
    if not is_valid:
        return (is_valid, error)
    
    return (True, None)

