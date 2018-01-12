/// <reference types="node" />
import { EventEmitter } from 'events';
import { Sipster, TransportConfig, EpConfig, AccountConfig, Call, CallInfo, Account, AudioMediaPlayer, AudioMediaRecorder, Media } from 'sipster.ts';
export { TransportConfig, EpConfig, AccountConfig, CallInfo, Media };
export interface PlayerConfig {
    player?: {
        /** filename to play while calling */
        filename: string;
    };
    recorder?: {
        /** filename to record while calling */
        filename: string;
    };
}
export interface PjsuaConfigs {
    /**
     * @see {@link https://minoruta.github.io/sipster.ts/interfaces/transportconfig.html|Sipster.ts.TransportConfig}
     * @see {@link http://www.pjsip.org/pjsip/docs/html/structpj_1_1TransportConfig.htm|Pjsip.TransportConfig}
     */
    transport: TransportConfig;
    /**
     * @see {@link https://minoruta.github.io/sipster.ts/interfaces/epconfig.html|Sipster.ts.EpConfig}
     * @see {@link http://www.pjsip.org/pjsip/docs/html/structpj_1_1EpConfig.htm|Pjsip.EpConfig}
     */
    endpoint: EpConfig;
    player: PlayerConfig;
}
/**
 * An adapter class to Sipster.ts.Call
 * @see {@link https://minoruta.github.io/sipster.ts/classes/call.html|Sipster.ts.Call}
 * @see {@link http://www.pjsip.org/pjsip/docs/html/classpj_1_1Call.htm|Pjsip.Call} as well
 * @fires CallExt#dtmf
 * @fires CallExt#disconnected
 */
export declare class CallExt extends EventEmitter {
    private readonly _call;
    private readonly _account;
    private readonly _playerConfig;
    private readonly _player?;
    private readonly _recorder?;
    private _medias?;
    readonly call: Call;
    protected readonly account: AccountExt;
    medias: Media[];
    protected readonly player: AudioMediaPlayer;
    protected readonly recorder: AudioMediaRecorder;
    constructor(account: AccountExt, call: Call, playerConfig?: PlayerConfig);
    onConfirmed(): void;
    onDtmf(digit: string): void;
    onDisconnected(): void;
    onMedia(medias: Media[]): void;
    /**
     * For incoming calls, this responds to the INVITE with an optional
     * statusCode (defaults to 200) and optional reason phrase.
     */
    answer(statusCode?: number, reason?: string): void;
    /**
     * Hangs up the call with an optional statusCode (defaults to 603)
     * and optional reason phrase. This function is different than answering
     * the call with 3xx-6xx response (with answer()), in that this function
     * will hangup the call regardless of the state and role of the call,
     * while answer() only works with incoming calls on EARLY state.
     */
    hangup(statusCode?: number, reason?: string): void;
}
/**
 * An adapter class to Sipster.ts.Account
 * @see {@link https://minoruta.github.io/sipster.ts/classes/account.html|Sipster.ts.Account}
 * @see {@link http://www.pjsip.org/pjsip/docs/html/classpj_1_1Account.htm|Pjsip.Account} as well
 * @fires AccountExt#registering
 * @fires AccountExt#unregistering
 * @fires AccountExt#unregistererd
 * @fires AccountExt#call
 */
export declare class AccountExt extends EventEmitter {
    private readonly _ua;
    private readonly _account;
    private readonly _playerConfig;
    private _state;
    private _call?;
    readonly account: Account;
    readonly isCallInProgress: boolean;
    readonly call: CallExt;
    readonly playerConfig: PlayerConfig;
    state: string;
    constructor(ua: Pjsua, account: Account, playerConfig?: PlayerConfig);
    onRegistering(): void;
    onRegistered(): void;
    onUnregistering(): void;
    onUnregistered(): void;
    onCall(info: CallInfo, call: Call): void;
    protected onConfirmed(): void;
    protected onConnecting(): void;
    protected onDisconnected(): void;
    protected onMedia(medias: Media[]): void;
    protected onDtmf(digit: string): void;
    /**
     * Start a new SIP call to destination.
     */
    makeCall(destination: string): Promise<CallExt>;
    /**
     * For incoming calls, this responds to the INVITE with an optional
     * statusCode (defaults to 200) and optional reason phrase.
     */
    answer(call: CallExt, statusCode?: number, reason?: string): Promise<void>;
    /**
     * Hangs up the call with an optional statusCode (defaults to 603)
     * and optional reason phrase. This function is different than answering
     * the call with 3xx-6xx response (with answer()), in that this function
     * will hangup the call regardless of the state and role of the call,
     * while answer() only works with incoming calls on EARLY state.
     */
    hangup(statusCode?: number, reason?: string): Promise<void>;
    /**
     * Update registration or perform unregistration.
     * You only need to call this method if you want to manually update the
     * registration or want to unregister from the server.
     * If renew is false, this will begin the unregistration process.
     * @param renew do 'register' to update expiration when true,
     *              do 'register' with expiration=0 to unregister when false.
     */
    setRegistration(renew: boolean): void;
}
/**
 * A simple Pjsua2 which provides player to playback and record
 */
export declare class Pjsua {
    private readonly _sipster;
    private readonly _playerConfig;
    private readonly _transport;
    private _account?;
    protected readonly sipster: Sipster;
    readonly account: AccountExt;
    readonly playerConfig: PlayerConfig;
    constructor(config: PjsuaConfigs);
    protected onRegistered(): void;
    protected onRegistering(): void;
    protected onUnregistering(): void;
    protected onUnregistered(): void;
    protected onCall(info: CallInfo, call: Call): void;
    /**
     * Make an account and start registration
     * @param accountConfig     is for making an acount
     * @return registered account.
     */
    makeAccount(accountConfig: AccountConfig): Promise<void>;
    /**
     * Delete an account and the registration
     */
    removeAccount(): Promise<void>;
}
