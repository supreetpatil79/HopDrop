"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
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
    MATCHING_ORCHESTRATOR_PORT: zod_1.z.coerce.number().default(5004),
    MATCHING_ORCHESTRATOR_LOG_LEVEL: zod_1.z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
    CORE_API_URL: zod_1.z.string().url(),
    INTERNAL_API_TOKEN: zod_1.z.string().min(16),
    KAFKA_BROKERS: zod_1.z.string().min(1),
    KAFKA_CLIENT_ID: zod_1.z.string().default('hopdrop-matching-orchestrator'),
    KAFKA_TOPIC_PREFIX: zod_1.z.string().default('hopdrop')
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    throw new Error(`Invalid environment variables: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`);
}
exports.env = parsed.data;
