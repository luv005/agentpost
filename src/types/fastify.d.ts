import "fastify";

declare module "fastify" {
  interface FastifyRequest {
    account: {
      id: string;
      name: string;
      email: string;
      plan: string;
      dailySendLimit: number;
      isVerified: boolean;
    };
  }
}
