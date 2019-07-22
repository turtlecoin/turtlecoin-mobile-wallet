// Copyright (C) 2018, Zpalmtree
// Copywrite (C) 2019 The 2acoin Developers (new api code)
// Copywrite (C) 2019 The Kegcoin Developers 
// Please see the included LICENSE file for more information.

/* TODO: replace with node fetch */
const request = require('request-promise-native');

import Config from './Config';
import Constants from './Constants';

import { Globals } from './Globals';

async function getBTCPrice() {
    let uri = 'https://tradecx.io/api/tickers/kegbtc';

    try {
        const res = await request({
            json: true,
            method: 'GET',
            timeout: 10000,
            url: uri,
        });

        const coinData = res.data.last;

        Globals.logger.addLogMessage('Updated coin price from tradecx API = ' + res.data.last);

        return coinData;
    } catch (error) {
        console.log('Failed to get price from API: ' + error);
        return 0;
    }
}

export async function getCoinPriceFromAPI() {
    /* Note: this gets btc price in fiat */
    let uri = `${Config.priceApiLink}?ids=bitcoin&vs_currencies=${getCurrencyTickers()}`;


    try {
        const data = await request({
            json: true,
            method: 'GET',
            timeout: Config.requestTimeout,
            url: uri,
        });

        const coinData = data['bitcoin'];

        Globals.logger.addLogMessage('Updated btc price from API');

        priceJSON = '{"kegcoin": {';
        currCount = 0;
        amount = await getBTCPrice();

        prices = coinData || {};

        for (const currency of Constants.currencies) {
            currCount += 1;

            // BTC Value must always be 1st so we can save and display proper value for other currencies
            if (currCount === 1) {
               btcAmount = amount;
            } else {
               amount = prices[currency.ticker] * btcAmount;
            }

            if (currCount < 16) {
               thisCurrency  = '"' + currency.ticker + '": ' + parseFloat(amount).toFixed(8) + ',';;
            } else {
               thisCurrency  = '"' + currency.ticker + '": ' + parseFloat(amount).toFixed(8);
            }

//            Globals.logger.addLogMessage('Built price for  = ' + thisCurrency);
            priceJSON = priceJSON + thisCurrency;
        }
        priceJSON = priceJSON + '}}';
//        Globals.logger.addLogMessage('Completed JSON structure = ' + priceJSON);

        return priceJSON;        
    } catch (error) {
        Globals.logger.addLogMessage('Failed to get btc price from API: ' + error);
        return undefined;
    }
}

function getCurrencyTickers() {
    return Constants.currencies.map((currency) => currency.ticker).join('%2C');
}

export async function coinsToFiat(amount, currencyTicker) {
    /* Coingecko returns price with decimal places, not atomic */
    let nonAtomic = amount / (10 ** Config.decimalPlaces);

    let prices = Globals.coinPrice || {};

    for (const currency of Constants.currencies) {
        if (currencyTicker === currency.ticker) {
            let converted = prices[currency.ticker] * nonAtomic;

            if (converted === undefined || isNaN(converted)) {
                return '';
            }

            let convertedString = converted.toString();

            /* Only show two decimal places if we've got more than '1' unit */
            if (converted > 1) {
                convertedString = converted.toFixed(2);
            } else {
                convertedString = converted.toFixed(8);
            }

            if (currency.symbolLocation === 'prefix') {
                return currency.symbol + convertedString;
            } else {
                return convertedString + ' ' + currency.symbol;
            }
        }
    }

    Globals.logger.addLogMessage('Failed to find currency: ' + currencyTicker);

    return '';
}
