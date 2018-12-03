export interface Bridge {
    maybeSendToActor(message: any): Promise<void>;
}
