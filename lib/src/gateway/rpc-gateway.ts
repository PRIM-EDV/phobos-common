import { signal, WritableSignal } from "@angular/core";
import { Subject } from "rxjs";
import { webSocket, WebSocketSubject } from "rxjs/webSocket";

import { v4 as uuidv4 } from "uuid";
import { RpcMessage } from "./interfaces/rpc-message.interface";

export abstract class RpcGateway<Msg extends RpcMessage, Req, Res> {
  public isConnected: WritableSignal<boolean> = signal(false);

  public onRequest: Subject<{ id: string; request: Req }> = new Subject<{ id: string; request: Req }>();
  public onMessage: Subject<Msg> = new Subject<Msg>();
  public onOpen: Subject<void> = new Subject<void>();
  public onClose: Subject<void> = new Subject<void>();

  protected abstract apiUrl: string;
  protected ws!: WebSocketSubject<any>;

  private pending = new Map<string, { response: (value: Res) => void; error: (value: Error) => void }>();

  constructor(protected codec: { toJSON: (m: RpcMessage) => any; fromJSON: (data: any) => Msg }) {}

  /**
   * Connects to the WebSocket backend.
   * @param jwt - JSON Web Token for authentication
   */
  public connect(jwt: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = webSocket({
        url: `${this.apiUrl}?token=${jwt}`,
        openObserver: {
          next: () => {
            this.isConnected.set(true);
            this.onOpen.next();
            resolve();
          },
        },
      });

      this.ws.subscribe({
        next: this.handleMessage.bind(this),
        error: (err) => {
          this.handleClose();
          reject(err);
        },
        complete: this.handleClose.bind(this),
      });
    });
  }

  /**
   * Disconnects from the WebSocket backend.
   */
  public disconnect() {
    this.ws.complete();
  }

  /**
   * Sends a request to the backend and ## resolves with the response.
   * @param req - The request payload
   * @returns A promise that resolves with the response from the backend
   */
  public request(req: Req): Promise<Res> {
    return new Promise((resolve, reject) => {
      const msg: RpcMessage = {
        id: uuidv4(),
        request: req,
      };
      this.pending.set(msg.id, { response: resolve.bind(this), error: reject.bind(this) });
      setTimeout(this.rejectOnTimeout.bind(this, msg.id, reject.bind(this, `${req} timed out`)), 5000);
      this.ws.next({ event: "msg", data: JSON.stringify(this.codec.toJSON(msg)) });
    });
  }

  /**
   * Responds to a request from the backend.
   * @param id - The id of the request to respond to
   * @param res - The response payload
   */
  public respond(id: string, res: Res) {
    const msg: RpcMessage = {
      id: id,
      response: res,
    };
    this.ws.next({ event: "msg", data: JSON.stringify(this.codec.toJSON(msg)) });
  }

  private handleMessage(buffer: { event: "msg"; data: string }) {
    const msg = this.codec.fromJSON(JSON.parse(buffer.data));
    if (msg.request) {
      this.onRequest.next({ id: msg.id, request: msg.request });
    }

    if (msg.response) {
      if (this.pending.has(msg.id)) {
        this.pending.get(msg.id)!.response(msg.response);
        this.pending.delete(msg.id);
      }
    }

    this.onMessage.next(msg);
  }

  private handleClose() {
    this.isConnected.set(false);
    setTimeout(this.connect.bind(this), 5000);
    this.onClose.next();
  }

  private rejectOnTimeout(id: string, reject: (reason?: any) => void) {
    if (this.pending.delete(id)) {
      reject();
    }
  }
}
