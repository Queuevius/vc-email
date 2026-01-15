import { describe, it, expect } from 'vitest'
import { isAdmin, isReadOnly, canPerformAction } from './permissions'
import { User } from 'next-auth'

describe('Permissions', () => {
    const adminUser: User = { id: '1', role: 'ADMIN', name: 'Admin', email: 'admin@example.com' }
    const readOnlyUser: User = { id: '2', role: 'READ_ONLY', name: 'ReadOnly', email: 'readonly@example.com' }
    const regularUser: User = { id: '3', role: 'USER', name: 'User', email: 'user@example.com' }

    describe('isAdmin', () => {
        it('should return true for ADMIN role', () => {
            expect(isAdmin(adminUser)).toBe(true)
        })
        it('should return false for other roles', () => {
            expect(isAdmin(readOnlyUser)).toBe(false)
            expect(isAdmin(regularUser)).toBe(false)
        })
        it('should return false for undefined user', () => {
            expect(isAdmin(undefined)).toBe(false)
        })
    })

    describe('isReadOnly', () => {
        it('should return true for READ_ONLY role', () => {
            expect(isReadOnly(readOnlyUser)).toBe(true)
        })
        it('should return false for other roles', () => {
            expect(isReadOnly(adminUser)).toBe(false)
            expect(isReadOnly(regularUser)).toBe(false)
        })
    })

    describe('canPerformAction', () => {
        it('should allow ADMIN to send_email', () => {
            expect(canPerformAction(adminUser, 'send_email')).toBe(true)
        })
        it('should not allow READ_ONLY to send_email', () => {
            expect(canPerformAction(readOnlyUser, 'send_email')).toBe(false)
        })
        it('should allow both to view_inbox', () => {
            expect(canPerformAction(adminUser, 'view_inbox')).toBe(true)
            expect(canPerformAction(readOnlyUser, 'view_inbox')).toBe(true)
        })
    })
})
