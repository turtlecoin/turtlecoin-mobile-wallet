// Copyright (C) 2018, Zpalmtree
//
// Please see the included LICENSE file for more information.

export default Constants = {
    walletFileFormatVersion: 0,

    /* Note: It falls back to USD, so I suggest not removing that */
    currencies: [
        {
            ticker: 'btc',
            coinName: 'Bitcoin',
            symbol: '₿',
            symbolLocation: 'prefix',
        },
        {
            ticker: 'eth',
            coinName: 'Ethereum',
            symbol: 'Ξ',
            symbolLocation: 'prefix',
        },
        {
            ticker: 'ltc',
            coinName: 'Litecoin',
            symbol: 'Ł',
            symbolLocation: 'prefix',
        },
        {
            ticker: 'keg',
            coinName: 'Kegcoin',
            symbol: '₭',
            symbolLocation: 'prefix',
        }
        {
            ticker: 'aud',
            coinName: 'Australian Dollar',
            symbol: '$',
            symbolLocation: 'prefix',
        },
        {
            ticker: 'cad',
            coinName: 'Canadian Dollar',
            symbol: '$',
            symbolLocation: 'prefix',
        },
        {
            ticker: 'cny',
            coinName: 'Chinese Yuan Renminbi',
            symbol: '¥',
            symbolLocation: 'prefix',
        },
        {
            ticker: 'chf',
            coinName: 'Swiss Franc',
            symbol: 'Fr',
            symbolLocation: 'postfix',
        },
        {
            ticker: 'eur',
            coinName: 'Euro',
            symbol: '€',
            symbolLocation: 'prefix',
        },
        {
            ticker: 'gbp',
            coinName: 'Great British Pound',
            symbol: '£',
            symbolLocation: 'prefix',
        },
        {
            ticker: 'inr',
            coinName: 'Indian Rupee',
            symbol: '₹',
            symbolLocation: 'prefix',
        },
        {
            ticker: 'jpy',
            coinName: 'Japanese Yen',
            symbol: '¥',
            symbolLocation: 'prefix',
        },
        {
            ticker: 'mxn',
            coinName: 'Mexican Peso',
            symbol: '$',
            symbolLocation: 'prefix',
        },
        {
            ticker: 'nzd',
            coinName: 'New Zealand Dollar',
            symbol: '$',
            symbolLocation: 'prefix',
        },
        {
            ticker: 'rub',
            coinName: 'Russian Ruble',
            symbol: '₽',
            symbolLocation: 'postfix',
        },
        {
            ticker: 'sek',
            coinName: 'Swedish Kronor',
            symbol: 'kr',
            symbolLocation: 'postfix',
        },
        {
            ticker: 'usd',
            coinName: 'United States Dollar',
            symbol: '$',
            symbolLocation: 'prefix',
        },
        
    ],

    numTransactionsPerPage: 15,
};
