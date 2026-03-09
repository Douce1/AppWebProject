export enum ClassStatus {
    Unassigned = 'unassigned',
    Requested = 'requested',
    Confirmed = 'confirmed',
    Cancelled = 'cancelled',
}

export enum AssignmentStatus {
    Pending = 'pending',
    Accepted = 'accepted',
    Rejected = 'rejected',
}

export enum CheckinStatus {
    Missing = 'missing',
    Normal = 'normal',
    Late = 'late',
    Suspicious = 'suspicious',
}

export enum ContractStatus {
    Draft = 'draft',
    Sent = 'sent',
    Viewed = 'viewed',
    Signed = 'signed',
}

export const BadgeColors: Record<string, { bg: string; text: string; dot: string }> = {
    // Gray
    [AssignmentStatus.Pending]: { bg: '#F5EFE2', text: '#7A6A58', dot: '#7A6A58' },
    [CheckinStatus.Missing]: { bg: '#F5EFE2', text: '#7A6A58', dot: '#7A6A58' },
    [ContractStatus.Draft]: { bg: '#F5EFE2', text: '#7A6A58', dot: '#7A6A58' },
    [ClassStatus.Unassigned]: { bg: '#F5EFE2', text: '#7A6A58', dot: '#7A6A58' },

    // Blue
    [ContractStatus.Sent]: { bg: '#FFF6DC', text: '#B7791F', dot: '#3B82F6' },

    // Purple
    [ContractStatus.Viewed]: { bg: '#F5EFE2', text: '#7A6A58', dot: '#7A6A58' }, // According to pen it uses bgGray but with Purple Dot, let's keep exact

    // Green
    [ClassStatus.Confirmed]: { bg: '#EAF7F0', text: '#10B981', dot: '#10B981' },
    [AssignmentStatus.Accepted]: { bg: '#EAF7F0', text: '#10B981', dot: '#10B981' },
    [ContractStatus.Signed]: { bg: '#EAF7F0', text: '#10B981', dot: '#10B981' },
    [CheckinStatus.Normal]: { bg: '#EAF7F0', text: '#10B981', dot: '#10B981' },

    // Yellow
    [ClassStatus.Requested]: { bg: '#FFF2D9', text: '#F59E0B', dot: '#F59E0B' },
    [CheckinStatus.Late]: { bg: '#FFF2D9', text: '#F59E0B', dot: '#F59E0B' },

    // Red
    [ClassStatus.Cancelled]: { bg: '#FCE9E7', text: '#EF4444', dot: '#EF4444' },
    [AssignmentStatus.Rejected]: { bg: '#FCE9E7', text: '#EF4444', dot: '#EF4444' },
};
