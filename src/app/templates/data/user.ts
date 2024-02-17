/**
 * User data from firebase
 */
export interface User {
    firstName: string | null
    lastName: string | null
    email: string | null
    sid: string | null
    idPrac: number | null
    id: string | null
    managerLastRef: string | null
    isAdmin: string | null
    uid: string | null
    foldersHidden: boolean
    initials: string,
    sessions: string[],
    inLogUsers: boolean,
    logUsersDate: any,
}