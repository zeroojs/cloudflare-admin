# Auth and Permissions

The project already includes a complete email-based authentication and role system.

## Authentication Features

Current flows:

- email registration
- registration with verification code
- email login
- forgot password
- change password while logged in
- admin password reset for other users

## Session Model

- the Worker creates a session token after login
- the frontend stores the token locally
- later requests send it through `X-Session-Token`
- the Worker restores the current user from KV

## Roles

There are three roles:

- `user`
- `admin`
- `super_admin`

## Permission Rules

### User

- can only access their own accounts
- can only access their own zone cache
- can only operate on their own business data

### Admin

- can view all users
- can view all Cloudflare accounts
- can view all zone cache entries
- cannot assign roles

### Super Admin

- has all admin visibility
- can assign roles
- can manage regular users and admins
- cannot have their own role modified

## Super Admin Detection

The super admin email is defined through `SUPER_ADMIN_EMAIL`.

When a user's email matches that value, the user is recognized as `super_admin`.

## Visibility Rules

- only a super admin can see the super admin record in the user list
- admins still do not see the super admin record

## Security Notifications

The project already sends notifications for:

- successful password reset
- successful password change
- admin password reset
