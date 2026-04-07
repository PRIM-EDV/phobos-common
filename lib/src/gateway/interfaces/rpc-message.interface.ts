export interface RpcMessage {
  id: string;
  request?: any;
  response?: any;
  error?: any;
}