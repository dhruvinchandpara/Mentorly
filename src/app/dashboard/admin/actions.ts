'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export type CreateMentorInput = {
    fullName: string
    email: string
    bio: string
    background: string
    expertise: string[]
    hourlyRate: number | null
}

export type UpdateMentorInput = {
    mentorId: string
    bio: string
    background: string
    expertise: string[]
    hourlyRate: number | null
}

export type ToggleStatusInput = {
    mentorId: string
    isActive: boolean
}

export async function createMentor(input: CreateMentorInput) {
    try {
        const supabase = createAdminClient()

        // 1. Create the auth user with a temporary password
        const tempPassword = `Mentor_${Math.random().toString(36).slice(2, 10)}!${Date.now()}`

        const { data: authData, error: authError } =
            await supabase.auth.admin.createUser({
                email: input.email,
                password: tempPassword,
                email_confirm: true, // Auto-confirm so they can login
                user_metadata: {
                    full_name: input.fullName,
                    role: 'mentor',
                },
            })

        if (authError) {
            return {
                success: false,
                error: authError.message,
            }
        }

        const userId = authData.user.id

        // 2. Update the profile to ensure role is 'mentor'
        //    (trigger should have created it, but let's make sure)
        const { error: profileError } = await supabase
            .from('profiles')
            .update({
                role: 'mentor',
                full_name: input.fullName,
            })
            .eq('id', userId)

        if (profileError) {
            console.error('Profile update error:', profileError)
        }

        // 3. Create the mentor record
        const { error: mentorError } = await supabase.from('mentors').insert({
            id: userId,
            bio: input.bio,
            background: input.background,
            expertise: input.expertise,
            hourly_rate: input.hourlyRate,
            is_active: true, // Admin-created mentors are active by default
        })

        if (mentorError) {
            return {
                success: false,
                error: mentorError.message,
            }
        }

        return {
            success: true,
            tempPassword,
            userId,
        }
    } catch (error) {
        console.error('Create mentor error:', error)
        return {
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : 'An unexpected error occurred',
        }
    }
}

export async function updateMentor(input: UpdateMentorInput) {
    try {
        const supabase = createAdminClient()

        const { error } = await supabase
            .from('mentors')
            .update({
                bio: input.bio,
                background: input.background,
                expertise: input.expertise,
                hourly_rate: input.hourlyRate,
            })
            .eq('id', input.mentorId)

        if (error) {
            return { success: false, error: error.message }
        }

        return { success: true }
    } catch (error) {
        console.error('Update mentor error:', error)
        return {
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : 'An unexpected error occurred',
        }
    }
}

export async function toggleMentorStatus(input: ToggleStatusInput) {
    try {
        const supabase = createAdminClient()

        const { error } = await supabase
            .from('mentors')
            .update({ is_active: input.isActive })
            .eq('id', input.mentorId)

        if (error) {
            return { success: false, error: error.message }
        }

        return { success: true }
    } catch (error) {
        console.error('Toggle status error:', error)
        return {
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : 'An unexpected error occurred',
        }
    }
}

export async function addAuthorizedStudent(email: string) {
    try {
        const supabase = createAdminClient()

        const { error } = await supabase
            .from('authorized_students')
            .insert({ email })

        if (error) {
            return { success: false, error: error.message }
        }

        return { success: true }
    } catch (error) {
        console.error('Add authorized student error:', error)
        return {
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : 'An unexpected error occurred',
        }
    }
}

export async function removeAuthorizedStudent(email: string) {
    try {
        const supabase = createAdminClient()

        const { error } = await supabase
            .from('authorized_students')
            .delete()
            .eq('email', email)

        if (error) {
            return { success: false, error: error.message }
        }

        return { success: true }
    } catch (error) {
        console.error('Remove authorized student error:', error)
        return {
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : 'An unexpected error occurred',
        }
    }
}

export async function bulkAddAuthorizedStudents(emails: string[]) {
    try {
        const supabase = createAdminClient()

        // Validate and clean emails
        const cleanedEmails = emails
            .map(email => email.toLowerCase().trim())
            .filter(email => {
                // Basic email validation
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
                return email && emailRegex.test(email)
            })

        if (cleanedEmails.length === 0) {
            return {
                success: false,
                error: 'No valid email addresses found',
            }
        }

        // Remove duplicates
        const uniqueEmails = Array.from(new Set(cleanedEmails))

        // Check which emails already exist
        const { data: existingEmails } = await supabase
            .from('authorized_students')
            .select('email')
            .in('email', uniqueEmails)

        const existingSet = new Set(
            (existingEmails || []).map(record => record.email)
        )

        // Filter out already existing emails
        const newEmails = uniqueEmails.filter(email => !existingSet.has(email))

        if (newEmails.length === 0) {
            return {
                success: true,
                added: 0,
                skipped: uniqueEmails.length,
                message: 'All emails were already authorized',
            }
        }

        // Insert new emails
        const { error } = await supabase
            .from('authorized_students')
            .insert(newEmails.map(email => ({ email })))

        if (error) {
            return { success: false, error: error.message }
        }

        return {
            success: true,
            added: newEmails.length,
            skipped: uniqueEmails.length - newEmails.length,
            message: `Successfully added ${newEmails.length} student(s). ${uniqueEmails.length - newEmails.length > 0 ? `${uniqueEmails.length - newEmails.length} already existed.` : ''}`,
        }
    } catch (error) {
        console.error('Bulk add authorized students error:', error)
        return {
            success: false,
            error:
                error instanceof Error
                    ? error.message
                    : 'An unexpected error occurred',
        }
    }
}

export async function grantAdminRole(email: string) {
    try {
        const supabase = createAdminClient()

        // 1. Find the profile by email
        const { data: profile, error: fetchError } = await supabase
            .from('profiles')
            .select('id, email, full_name')
            .eq('email', email)
            .single()

        if (fetchError || !profile) {
            return {
                success: false,
                error: `User with email ${email} not found. Ensure they have signed up first.`,
            }
        }

        // 2. Update the role to 'admin'
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ role: 'admin' })
            .eq('id', profile.id)

        if (updateError) {
            return { success: false, error: updateError.message }
        }

        // 3. Update auth metadata as well
        const { error: authError } = await supabase.auth.admin.updateUserById(
            profile.id,
            { user_metadata: { role: 'admin' } }
        )

        if (authError) {
            console.warn('Auth metadata update failed:', authError.message)
        }

        return { success: true, message: `Successfully promoted ${profile.full_name || email} to Admin.` }
    } catch (error) {
        console.error('Grant admin role error:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'An unexpected error occurred',
        }
    }
}
