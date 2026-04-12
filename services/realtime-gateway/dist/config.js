"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.allowedOrigins = exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const zod_1 = require("zod");
[
    path_1.default.resolve(process.cwd(), '../../.env'),
    path_1.default.resolve(process.cwd(), '.env')
].forEach((envPath) => {
    dotenv_1.default.config({ path: envPath, override: false });
});
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'test', 'production']).default('development'),
    PORT: zod_1.z.coerce.number().default(5002),
    FRONTEND_URL: zod_1.z.string().default('http://localhost'),
    REDIS_URL: zod_1.z.string().optional(),
    REDIS_CACHE_URL: zod_1.z.string().optional(),
    JWT_ACCESS_SECRET: zod_1.z.string().min(64),
    REALTIME_EVENT_CHANNEL: zod_1.z.string().default('hopdrop:realtime:events'),
    LOG_LEVEL: zod_1.z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info')
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    throw new Error(`Invalid environment variables: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`);
}
exports.env = parsed.data;
exports.allowedOrigins = exports.env.FRONTEND_URL.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
