"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const pino_1 = __importDefault(require("pino"));
const config_1 = require("./config");
exports.logger = (0, pino_1.default)({
    level: config_1.env.SEARCH_INDEXER_LOG_LEVEL,
    base: {
        service: 'search-indexer',
        env: config_1.env.NODE_ENV
    },
    timestamp: pino_1.default.stdTimeFunctions.isoTime
});
