import {spawn} from 'child_process';
import {DateHelper, FileHelper, Logger} from 'flyingfish_core';
import path from 'path';
import {ISsl} from '../ISsl.js';

/**
 * Certbot
 */
export class Certbot implements ISsl {

    public static readonly LIMIT_REQUESTS = 5;
    public static readonly LIMIT_TIME_HOUR = 1;

    /**
     * isOverLimit
     * @param trycount
     */
    public isOverLimit(trycount: number): boolean {
        return trycount >= Certbot.LIMIT_REQUESTS;
    }

    /**
     * isOverTime
     * @param lastrequstTime
     */
    public isOverTime(lastrequstTime: number): boolean {
        return DateHelper.isOverAHour(lastrequstTime, Certbot.LIMIT_TIME_HOUR);
    }

    /**
     * isOverLimitAndInTime
     * @param trycount
     * @param lastrequstTime
     */
    public isOverLimitAndInTime(trycount: number, lastrequstTime: number): boolean {
        return this.isOverLimit(trycount) && !this.isOverTime(lastrequstTime);
    }

    /**
     * isOverLimitAndTime
     * @param trycount
     * @param lastrequstTime
     */
    public isOverLimitAndTime(trycount: number, lastrequstTime: number): boolean {
        return this.isOverLimit(trycount) && this.isOverTime(lastrequstTime);
    }

}