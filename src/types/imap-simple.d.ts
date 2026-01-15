declare module 'imap-simple' {
  interface ImapConfig {
    imap: {
      user: string;
      password: string;
      host: string;
      port: number;
      tls: boolean;
      tlsOptions?: {
        rejectUnauthorized?: boolean;
      };
      authTimeout?: number;
    };
  }

  interface MessageAttributes {
    uid: number;
    date?: Date;
    flags?: string[];
    struct?: any;
  }

  interface Message {
    attributes: MessageAttributes;
    parts?: Array<{ body: string | Buffer }>;
    body?: string | Buffer;
  }

  interface Connection {
    openBox(mailbox: string): Promise<void>;
    search(criteria: any[], options: any): Promise<Message[]>;
    getPartData(message: Message, part: any): Promise<string | Buffer>;
    addFlags(uid: number, flag: string): Promise<void>;
    removeFlags(uid: number, flag: string): Promise<void>;
    end(): void;
    imap: {
      expunge(callback: (err: any) => void): void;
    };
  }

  interface Part {
    which?: string;
    [key: string]: any;
  }

  export function connect(config: ImapConfig): Promise<Connection>;
  export function getParts(struct: any): Part[];
}



