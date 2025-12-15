import { TokenPayload } from "../../utils/tokens";

declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface Request {
      user?: TokenPayload;
    }
  }
}
