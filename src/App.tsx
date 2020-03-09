import React, { ChangeEvent, useEffect, useState } from 'react';
import axios from 'axios';
import { Input, Dimmer, Loader } from 'semantic-ui-react';

import { IRepayment } from './components/repaymentsTable/RepaymentsTable';
import { ProductSection } from './components/productSection/ProductSection';
import { constrainValue } from './utils/utils';

import './App.css';


interface IProductConfig {
    amount_min: number;
    amount_max: number;
    duration_min: number;
    duration_max: number;
}


function App(): JSX.Element {
    const configUrl = 'http://www.mocky.io/v2/5d4aa9e93300006f000f5ea9';

    const initialAmount = 10000;
    const amountStep = 100;
    const initialDuration = 4;
    const minInterestRate = 0;
    const maxInterestRate = 30;
    const initialRCFInterestRate = 3;
    const initialBLInterestRate = 3;
    const bLInitialFeePercent = 10;

    const [rcfRates, setRcfRates] = useState<IRepayment[]>([]);
    const [blRates, setBlRates] = useState<IRepayment[]>([]);
    const [amount, setAmount] = useState<number>(initialAmount);
    const [duration, setDuration] = useState<number>(initialDuration);
    const [rCFInterestRate, setRCFInterestRate] = useState<number>(initialRCFInterestRate);
    const [bLInterestRate, setBLInterestRate] = useState<number>(initialBLInterestRate);

    const [configLoaded, setConfigLoaded] = useState<boolean>(false);

    const [rcfConfig, setRcfConfig] = useState<IProductConfig | null>(null);
    const [blConfig, setBlConfig] = useState<IProductConfig | null>(null);

    const [rcfValid, setRcfValid] = useState<boolean>(false);
    const [blValid, setBlValid] = useState<boolean>(false);

    const [errorMessage, setErrorMessage] = useState<string>('');


    useEffect(() => {
        (async (): Promise<void> => {
            try {
                const config = await axios.get(configUrl);
                const configData = config.data;

                setRcfConfig(configData.revolving_credit_facility);
                setBlConfig(configData.business_loan);
                setConfigLoaded(true);
            }
            catch (err) {
                setErrorMessage("Ooops, could not load application's configuration");
                console.error('error:', err);
            }
        })();
    }, []);

    useEffect(() => {
        const bLInitialFee = amount / bLInitialFeePercent;
        const year = new Date().getFullYear();
        const currentMonth = new Date().getUTCMonth();
        const day = new Date().getUTCDay() + 1;

        const calculateRates = (interestRate: number, initialFee: number): IRepayment[] => {
            const rates: IRepayment[] = [];
            if (duration < 1) {
                return rates;
            }
            const principal = amount / duration;
            for (let month = 1; month <= duration; month++) {
                const dateString = (new Date(Date.UTC(year, currentMonth + month, day))).toLocaleDateString();
                const baseInterest = (amount - principal * (month - 1)) * interestRate / 100;
                const interest = month === 1
                    ? baseInterest + initialFee
                    : baseInterest;
                const total = principal + interest;
                rates.push({
                    dateString,
                    principal,
                    interest,
                    total
                });
            }
            return rates;
        };

        const isProductValid = (productConfig: IProductConfig | null): boolean => {
            return productConfig
                ? amount >= productConfig.amount_min
                && amount <= productConfig.amount_max
                && duration >= productConfig.duration_min
                && duration <= productConfig.duration_max
                : false;
        };
        setRcfRates(calculateRates(rCFInterestRate, 0));
        setBlRates(calculateRates(bLInterestRate, bLInitialFee));
        setRcfValid(isProductValid(rcfConfig));
        setBlValid(isProductValid(blConfig));
    }, [amount, duration, rCFInterestRate, bLInterestRate, rcfConfig, blConfig]);

    const getMinAmount = (): number => {
        return Math.min(rcfConfig ? rcfConfig.amount_min : 1, blConfig ? blConfig.amount_min : 1);
    };

    const getMaxAmount = (): number => {
        return Math.max(rcfConfig ? rcfConfig.amount_max : 1, blConfig ? blConfig.amount_max : 1);
    };

    const getMinDuration = (): number => {
        return Math.min(rcfConfig ? rcfConfig.duration_min : 1, blConfig ? blConfig.duration_min : 1);
    };

    const getMaxDuration = (): number => {
        return Math.max(rcfConfig ? rcfConfig.duration_max : 1, blConfig ? blConfig.duration_max : 1);
    };

    const onAmountChange = (ev: ChangeEvent<HTMLInputElement>): void => {
        const newAmount = parseInt(ev.target.value);
        setAmount(constrainValue(newAmount, getMinAmount(), getMaxAmount()));
    };

    const onDurationChange = (ev: ChangeEvent<HTMLInputElement>): void => {
        const newDuration = parseInt(ev.target.value);
        setDuration(constrainValue(newDuration, getMinDuration(), getMaxDuration()));
    };

    const onRCFInterestChange = (newRate: number): void => {
        setRCFInterestRate(constrainValue(newRate, minInterestRate, maxInterestRate));
    };

    const onBLInterestChange = (newRate: number): void => {
        setBLInterestRate(constrainValue(newRate, minInterestRate, maxInterestRate));
    };

    const renderForm = (): JSX.Element => (
        <form>
            <div>
                <Input
                    className='amount'
                    type="number"
                    value={amount}
                    step={amountStep}
                    onChange={onAmountChange}
                    label='Amount requested'
                    size='large'
                />
                &pound;
            </div>
            <div>
                <Input
                    type="number"
                    value={duration}
                    onChange={onDurationChange}
                    label='Duration'
                    size='large'
                />
                months
            </div>
        </form>
    );

    const renderTables = (): JSX.Element => (
        <div className='tables-section'>
            <ProductSection
                title='Revolving Credit Facility'
                productValid={rcfValid}
                repayments={rcfRates}
                interestRate={rCFInterestRate}
                onInterestChange={onRCFInterestChange}
            />
            <ProductSection
                title='Business Loan'
                productValid={blValid}
                repayments={blRates}
                interestRate={bLInterestRate}
                onInterestChange={onBLInterestChange}
            />
        </div>
    );

    const renderMain = (): JSX.Element => (
        <>
            {renderForm()}
            {renderTables()}
        </>
    );

    return (
        <div className="App">
            <header className="App-header">
                {configLoaded
                    ? renderMain()
                    : errorMessage
                        ? <div>errorMessage</div>
                        : <Dimmer active>
                            <Loader size='huge'>Loading</Loader>
                        </Dimmer>
                }
            </header>
        </div>
    );
}

export default App;