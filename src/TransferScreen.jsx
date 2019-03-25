// Copyright (C) 2018, Zpalmtree
//
// Please see the included LICENSE file for more information.

import React from 'react';

import AntDesign from 'react-native-vector-icons/AntDesign';
import SimpleLineIcons from 'react-native-vector-icons/SimpleLineIcons';

import QRCodeScanner from 'react-native-qrcode-scanner';

import TextTicker from 'react-native-text-ticker';

import * as Qs from 'query-string';

import HeaderButtons, { HeaderButton, Item } from 'react-navigation-header-buttons';

import { HeaderBackButton, StackActions } from 'react-navigation';

import {
    validateAddresses, WalletErrorCode, validatePaymentID, prettyPrintAmount,
} from 'turtlecoin-wallet-backend';

import {
    View, Text, TextInput, TouchableWithoutFeedback, FlatList, Platform,
    ScrollView, Clipboard, Alert,
} from 'react-native';

import { Input, Button } from 'react-native-elements';

import Config from './Config';
import ListItem from './ListItem';
import List from './ListContainer';

import { Styles } from './Styles';
import { Globals } from './Globals';
import { Hr, BottomButton } from './SharedComponents';
import { removeFee, toAtomic, fromAtomic, addFee } from './Fee';
import { getArrivalTime, navigateWithDisabledBack, delay, toastPopUp } from './Utilities';

export class QrScannerScreen extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <View style={{ flex: 1, backgroundColor: this.props.screenProps.theme.backgroundColour }}>
                <QRCodeScanner
                    onRead={(code) => {
                        this.props.navigation.goBack();
                        this.props.navigation.state.params.setAddress(code.data);
                    }}
                    cameraProps={{ captureAudio: false }}
                />
            </View>
        );
    }
}

class AmountInput extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <Input
                containerStyle={{
                    width: '90%',
                    marginLeft: 20,
                    marginBottom: this.props.marginBottom || 0,
                }}
                inputContainerStyle={{
                    borderColor: this.props.screenProps.theme.notVeryVisibleColour,
                    borderWidth: 1,
                    borderRadius: 2,
                }}
                label={this.props.label}
                labelStyle={{
                    marginBottom: 5,
                    marginRight: 2,
                    color: this.props.screenProps.theme.slightlyMoreVisibleColour,
                }}
                rightIcon={
                    <Text style={{ fontSize: 30, marginRight: 10, color: this.props.screenProps.theme.primaryColour }}>
                        {this.props.currency}
                    </Text>
                }
                keyboardType={'number-pad'}
                inputStyle={{
                    color: this.props.screenProps.theme.primaryColour,
                    fontSize: 30,
                    marginLeft: 5
                }}
                errorMessage={this.props.errorMessage}
                value={this.props.value}
                onChangeText={(text) => this.props.onChangeText(text)}
            />
        );
    }
}

const CrossIcon = passMeFurther => (
    <HeaderButton {...passMeFurther} IconComponent={AntDesign} iconSize={23} color='red' />
);

class CrossButton extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <HeaderButtons HeaderButtonComponent={CrossIcon}>
                <Item
                    title=''
                    iconName='close'
                    onPress={() => {
                        this.props.navigation.dispatch(StackActions.popToTop());
                        this.props.navigation.navigate('Main');
                    }}
                    buttonWrapperStyle={{ marginRight: 10 }}
                />
            </HeaderButtons>
        );
    }
}

function validAmount(amount, unlockedBalance) {
    if (amount === '' || amount === undefined || amount === null) {
        return [false, ''];
    }

    /* Remove commas in input */
    amount = amount.replace(/,/g, '');

    let numAmount = Number(amount);

    if (isNaN(numAmount)) {
        return [false, 'Amount is not a number!'];
    }

    /* Remove fractional component and convert to atomic */
    numAmount = Math.floor(toAtomic(numAmount));

    /* Must be above min send */
    if (numAmount < 1) {
        return [false, 'Amount is below minimum send!'];
    }

    if (numAmount > unlockedBalance) {
        return [false, 'Not enough funds available!'];
    }

    return [true, ''];
}

/**
 * Send a transaction
 */
export class TransferScreen extends React.Component {
    static navigationOptions = ({ navigation, screenProps }) => {
        return {
            title: '',
            headerRight: (
                <CrossButton navigation={navigation} />
            ),
        }
    };

    constructor(props) {
        super(props);

        const [unlockedBalance, lockedBalance] = Globals.wallet.getBalance();

        this.state = {
            unlockedBalance,
            lockedBalance,
            errMsg: '',
            continueEnabled: false,
            unlockedBalanceHuman: fromAtomic(unlockedBalance),
            youSendAmount: '',
            youSendAmountCurrency: '',
            recipientGetsAmount: '',
            recipientGetsAmountCurrency: '',
            feeInfo: {},
        }
    }

    tick() {
        const [unlockedBalance, lockedBalance] = Globals.wallet.getBalance();

        this.setState({
            unlockedBalance,
            lockedBalance,
            unlockedBalanceHuman: fromAtomic(unlockedBalance),
        });
    }

    checkErrors(amount) {
        const [valid, error] = validAmount(amount, this.state.unlockedBalance);

        this.setState({
            continueEnabled: valid,
            errMsg: error,
        });
    }

    convertSentToReceived(amount) {
        if (amount !== undefined && amount !== null) {
            amount = amount.replace(/,/g, '');
        }

        let numAmount = Number(amount);

        let result = '';
        let feeInfo = {};

        if (!isNaN(numAmount) && numAmount > 0) {
            feeInfo = removeFee(numAmount);
            result = feeInfo.remaining;
        }

        this.setState({
            recipientGetsAmount: result,
            youSendAmountCurrency: (parseFloat(amount) * Globals.coinPrice[Globals.preferences.currency]).toFixed(8),
            recipientGetsAmountCurrency: (parseFloat(result) * Globals.coinPrice[Globals.preferences.currency]).toFixed(8),
            feeInfo,
        }, () => { this.checkErrors(this.state.recipientGetsAmount) });
    }

    convertReceivedToSent(amount) {
        if (amount !== undefined && amount !== null) {
            amount = amount.replace(/,/g, '');
        }

        let numAmount = Number(amount);

        let result = '';
        let feeInfo = {};

        if (!isNaN(numAmount) && numAmount > 0) {
            feeInfo = addFee(numAmount);
            result = feeInfo.original;
        }

        this.setState({
            youSendAmount: result,
            youSendAmountCurrency: (parseFloat(result) * Globals.coinPrice[Globals.preferences.currency]).toFixed(8),
            recipientGetsAmountCurrency: (parseFloat(amount) * Globals.coinPrice[Globals.preferences.currency]).toFixed(8),
            feeInfo
        }, () => { this.checkErrors(this.state.youSendAmount) });
    }

    componentDidMount() {
        this.interval = setInterval(() => this.tick(), 10000);
    }

    componentWillUnmount() {
        clearInterval(this.interval);
    }

    render() {
        return (
            <ScrollView style={{
                backgroundColor: this.props.screenProps.theme.backgroundColour,
                flex: 1,
            }}>
                <View style={{
                    alignItems: 'flex-start',
                    justifyContent: 'flex-start',
                    flex: 1,
                    marginTop: 60,
                    backgroundColor: this.props.screenProps.theme.backgroundColour,
                }}>

                    <Text style={{
                        color: this.props.screenProps.theme.primaryColour,
                        fontSize: 25,
                        marginBottom: 40,
                        marginLeft: 30
                    }}>
                        How much {Config.coinName} do you want to send?
                    </Text>


                    <AmountInput
                        label={'You send'}
                        value={this.state.youSendAmount}
                        onChangeText={(text) => {
                            this.setState({
                                youSendAmount: text,
                            });

                            this.convertSentToReceived(text);

                            this.checkErrors(text);
                        }}
                        errorMessage={this.state.errMsg}
                        marginBottom={40}
                        currency={Config.ticker}
                        {...this.props}
                    />

                    <AmountInput
                        label={'You send in ' + Globals.preferences.currency.toUpperCase()}
                        value={this.state.youSendAmountCurrency}
                        onChangeText={(text) => {
                            text = (parseFloat(text) / Globals.coinPrice[Globals.preferences.currency]).toFixed(2);
                            this.setState({
                                youSendAmount: text,
                            });

                            this.convertSentToReceived(text);
                            this.checkErrors(text);
                        }}
                        currency={Globals.preferences.currency.toUpperCase()}
                        errorMessage={this.state.errMsg}
                        marginBottom={40}
                        {...this.props}
                    />

                    <AmountInput
                        label={'Recipient gets'}
                        value={this.state.recipientGetsAmount}
                        onChangeText={(text) => {
                            this.setState({
                                recipientGetsAmount: text,
                            });

                            this.convertReceivedToSent(text);
                            this.checkErrors(text);
                        }}
                        marginBottom={40}
                        currency={Config.ticker}
                        {...this.props}
                    />

                    <AmountInput
                        label={'Recipient gets in ' + Globals.preferences.currency.toUpperCase()}
                        value={this.state.recipientGetsAmountCurrency}
                        onChangeText={(text) => {
                            text = (parseFloat(text) / Globals.coinPrice[Globals.preferences.currency]).toFixed(2);
                            this.setState({
                                recipientGetsAmountCurrency: text,
                            });

                            this.convertReceivedToSent(text);
                            this.checkErrors(text);
                        }}
                        marginBottom={40}
                        currency={Globals.preferences.currency.toUpperCase()}
                        {...this.props}
                    />

                    <View style={{ marginLeft: '70%' }}>
                        <Button
                            title="Send Max"
                            onPress={() => {
                                this.setState({
                                    youSendAmount: this.state.unlockedBalanceHuman,
                                });

                                this.convertSentToReceived(this.state.unlockedBalanceHuman);

                                this.checkErrors(this.state.unlockedBalanceHuman);
                            }}
                            titleStyle={{
                                color: this.props.screenProps.theme.primaryColour,
                                textDecorationLine: 'underline',
                            }}
                            type="clear"
                        />
                    </View>

                    <Text style={{
                        color: this.props.screenProps.theme.primaryColour,
                        fontSize: 18,
                        marginLeft: 30,
                        marginTop: 20,
                    }}>
                        Should arrive in {getArrivalTime()}
                    </Text>

                    <BottomButton
                        title="Continue"
                        onPress={() => {
                            this.props.navigation.navigate(
                                'Confirm', {
                                    payee: this.props.navigation.state.params.payee,
                                    amount: this.state.feeInfo,
                                }
                            );
                        }}
                        disabled={!this.state.continueEnabled}
                        {...this.props}
                    />

                </View>
            </ScrollView>
        );
    }
}

class AddressBook extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            payees: Globals.payees,
            index: 0,
        };

        Globals.updatePayeeFunctions.push(() => {
            this.setState(prevState => ({
                payees: Globals.payees,
                index: prevState.index + 1,
            }))
        });
    }

    render() {
        return (
            <List style={{
                marginBottom: 20,
                backgroundColor: this.props.screenProps.theme.backgroundColour
            }}>
                <FlatList
                    extraData={this.state.index}
                    data={this.state.payees}
                    keyExtractor={item => item.nickname}
                    renderItem={({ item }) => (
                        <ListItem
                            title={item.nickname}
                            subtitle={item.address.substr(0, 15) + '...'}
                            subtitleStyle={{
                                fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace'
                            }}
                            leftIcon={
                                <View style={{
                                    width: 50,
                                    height: 50,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: this.props.screenProps.theme.iconColour,
                                    borderRadius: 45
                                }}>
                                    <Text style={[Styles.centeredText, {
                                        fontSize: 30,
                                        color: this.props.screenProps.theme.primaryColour,
                                    }]}>
                                        {item.nickname[0].toUpperCase()}
                                    </Text>
                                </View>
                            }
                            titleStyle={{
                                color: this.props.screenProps.theme.slightlyMoreVisibleColour,
                            }}
                            subtitleStyle={{
                                color: this.props.screenProps.theme.slightlyMoreVisibleColour,
                            }}
                            onPress={() => {
                                this.props.navigation.navigate(
                                    'Transfer', {
                                        payee: item,
                                    }
                                );
                            }}
                        />
                    )}
                />
            </List>
        );
    }
}

class ExistingPayees extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        const noPayeesComponent =
            <View>
                <Hr />
                <Text style={{
                    color: this.props.screenProps.theme.primaryColour,
                    marginTop: 10,
                    fontSize: 16
                }}>
                    Your address book is empty! Add a new recipient above to populate it.
                </Text>
            </View>

        return (
            <View style={{
                width: '90%',
                maxHeight: 385,
            }}>
                <Text style={{
                    color: this.props.screenProps.theme.primaryColour,
                    marginTop: 40
                }}>
                    Address Book
                </Text>

                {Globals.payees.length > 0 ? <AddressBook {...this.props} /> : noPayeesComponent}
            </View>
        );
    }
}

export class NewPayeeScreen extends React.Component {
    static navigationOptions = ({ navigation }) => {
        return {
            headerRight: (
                <CrossButton navigation={navigation} />
            ),
        }
    };

    constructor(props) {
        super(props);

        const address = this.props.navigation.getParam('address', '');
        const paymentID = this.props.navigation.getParam('paymentID', '');

        this.state = {
            nickname: '',
            address,
            paymentID,
            paymentIDEnabled: address.length !== Config.integratedAddressLength,
            addressError: '',
            paymentIDError: '',
            nicknameError: '',
        };
    }

    setAddressFromQrCode(address) {
        this.setState({
            address,
        }, () => this.checkErrors());
    }

    async validAddress(address) {
        let errorMessage = '';

        if (address === '' || address === undefined || address === null) {
            return [false, errorMessage];
        }

        /* Disable payment ID and wipe input if integrated address */
        if (address.length === Config.integratedAddressLength) {
            await this.setState({
                paymentID: '',
                paymentIDEnabled: false,
            });
        } else {
            this.setState({
                paymentIDEnabled: true,
            });
        }

        const addressError = validateAddresses([address], true);

        if (addressError.errorCode !== WalletErrorCode.SUCCESS) {
            errorMessage = addressError.toString();

            return [false, errorMessage];
        }

        return [true, errorMessage];
    }

    validPaymentID(paymentID) {
        let errorMessage = '';

        if (paymentID === '') {
            return [true, errorMessage];
        }

        if (paymentID === undefined || paymentID === null) {
            return [false, errorMessage];
        }

        const paymentIDError = validatePaymentID(paymentID);

        if (paymentIDError.errorCode !== WalletErrorCode.SUCCESS) {
            errorMessage = paymentIDError.toString();

            return [false, errorMessage];
        }

        return [true, errorMessage];
    }

    validNickname(nickname) {
        let errorMessage = '';

        if (nickname === '' || nickname === undefined || nickname === null) {
            return [false, errorMessage];
        }

        if (Globals.payees.some((payee) => payee.nickname === nickname)) {
            errorMessage = `A payee with the name ${nickname} already exists.`;
            return [false, errorMessage];
        }

        return [true, errorMessage];
    }

    checkErrors() {
        (async () => {

            const [addressValid, addressError] = await this.validAddress(this.state.address);
            const [paymentIDValid, paymentIDError] = this.validPaymentID(this.state.paymentID);
            const [nicknameValid, nicknameError] = this.validNickname(this.state.nickname);

            this.setState({
                continueEnabled: addressValid && paymentIDValid && nicknameValid,
                addressError,
                paymentIDError,
                nicknameError,
            });

        })();
    }

    render() {
        return (
            <View style={{
                backgroundColor: this.props.screenProps.theme.backgroundColour,
                flex: 1,
            }}>
                <View style={{
                    alignItems: 'flex-start',
                    justifyContent: 'flex-start',
                    flex: 1,
                    marginTop: 60,
                }}>
                    <Text style={{ color: this.props.screenProps.theme.primaryColour, fontSize: 25, marginBottom: 40, marginLeft: 30 }}>
                        New Payee
                    </Text>

                    <Input
                        containerStyle={{
                            width: '90%',
                            marginLeft: 20,
                            marginBottom: 30,
                        }}
                        inputContainerStyle={{
                            borderColor: this.props.screenProps.theme.notVeryVisibleColour,
                            borderWidth: 1,
                            borderRadius: 2,
                        }}
                        label={'Name of recipient'}
                        labelStyle={{
                            marginBottom: 5,
                            marginRight: 2,
                            color: this.props.screenProps.theme.slightlyMoreVisibleColour,
                        }}
                        inputStyle={{
                            color: this.props.screenProps.theme.primaryColour,
                            fontSize: 30,
                            marginLeft: 5
                        }}
                        value={this.state.nickname}
                        onChangeText={(text) => {
                            this.setState({
                                nickname: text,
                            }, () => this.checkErrors());
                        }}
                        errorMessage={this.state.nicknameError}
                    />

                    <Input
                        containerStyle={{
                            width: '90%',
                            marginLeft: 20,
                        }}
                        inputContainerStyle={{
                            borderColor: this.props.screenProps.theme.notVeryVisibleColour,
                            borderWidth: 1,
                            borderRadius: 2,
                        }}
                        maxLength={Config.integratedAddressLength}
                        label={'Recipient\'s address'}
                        labelStyle={{
                            marginBottom: 5,
                            marginRight: 2,
                            color: this.props.screenProps.theme.slightlyMoreVisibleColour,
                        }}
                        inputStyle={{
                            color: this.props.screenProps.theme.primaryColour,
                            fontSize: 15,
                            marginLeft: 5
                        }}
                        value={this.state.address}
                        onChangeText={(text) => {
                            this.setState({
                                address: text,
                            }, () => this.checkErrors());
                        }}
                        errorMessage={this.state.addressError}
                    />

                    <View style={{ marginLeft: '63%' }}>
                        <Button
                            title='Scan QR Code'
                            onPress={() => {
                                this.props.navigation.navigate('QrScanner', { setAddress: this.setAddressFromQrCode.bind(this) });
                            }}
                            titleStyle={{
                                color: this.props.screenProps.theme.primaryColour,
                                textDecorationLine: 'underline',
                            }}
                            type="clear"
                        />
                    </View>

                    <Input
                        containerStyle={{
                            width: '90%',
                            marginLeft: 20,
                        }}
                        inputContainerStyle={{
                            borderColor: this.props.screenProps.theme.notVeryVisibleColour,
                            borderWidth: 1,
                            borderRadius: 2,
                        }}
                        maxLength={64}
                        label={'Recipient\'s Payment ID (optional)'}
                        labelStyle={{
                            marginBottom: 5,
                            marginRight: 2,
                            color: this.props.screenProps.theme.slightlyMoreVisibleColour,
                        }}
                        inputStyle={{
                            color: this.props.screenProps.theme.primaryColour,
                            fontSize: 15,
                            marginLeft: this.state.paymentIDEnabled ? 5 : 0,
                            backgroundColor: this.state.paymentIDEnabled ? this.props.screenProps.theme.backgroundColour : this.props.screenProps.theme.disabledColour,
                        }}
                        value={this.state.paymentID}
                        onChangeText={(text) => {
                            this.setState({
                                paymentID: text
                            }, () => this.checkErrors());
                        }}
                        editable={this.state.paymentIDEnabled}
                        errorMessage={this.state.paymentIDError}
                    />

                    <BottomButton
                        title="Continue"
                        onPress={() => {
                            const payee = {
                                nickname: this.state.nickname,
                                address: this.state.address,
                                paymentID: this.state.paymentID,
                            };

                            /* Add payee to global payee store */
                            Globals.addPayee(payee);

                            const finishFunction = this.props.navigation.getParam('finishFunction', undefined);

                            if (finishFunction) {
                                finishFunction();
                            } else {
                                const amount = this.props.navigation.getParam('amount', undefined);

                                /* Already have an amount, don't need to go to transfer screen */
                                if (amount) {
                                    this.props.navigation.navigate(
                                        'Confirm', {
                                            payee,
                                            amount: addFee(Number(amount)),
                                        }
                                    );

                                } else {
                                    this.props.navigation.navigate(
                                        'Transfer', {
                                            payee,
                                        }
                                    );
                                }
                            }
                        }}
                        disabled={!this.state.continueEnabled}
                        {...this.props}
                    />
                </View>
            </View>
        );
    }
}

class ModifyMemo extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <Input
                containerStyle={{
                    width: '100%',
                }}
                inputContainerStyle={{
                    borderColor: this.props.screenProps.theme.notVeryVisibleColour,
                    borderWidth: 1,
                    borderRadius: 2,
                    width: '100%',
                    height: 30,
                }}
                inputStyle={{
                    color: this.props.screenProps.theme.primaryColour,
                    fontSize: 14,
                }}
                value={this.props.memo}
                onChangeText={(text) => {
                    if (this.props.onChange) {
                        this.props.onChange(text);
                    }
                }}
            />
        );
    }
}

export class ConfirmScreen extends React.Component {
    static navigationOptions = ({ navigation }) => {
        return {
            headerRight: (
                <CrossButton navigation={navigation} />
            ),
        }
    };

    constructor(props) {
        super(props);

        this.state = {
            memo: '',
            modifyMemo: false,
        }
    }

    render() {
        return (
            <View style={{ flex: 1, backgroundColor: this.props.screenProps.theme.backgroundColour }}>
                <View style={{
                    alignItems: 'flex-start',
                    justifyContent: 'flex-start',
                    marginTop: 60,
                    marginHorizontal: 30,
                }}>
                    <Text style={{ color: this.props.screenProps.theme.primaryColour, fontSize: 25, marginBottom: 25, fontWeight: 'bold' }}>
                        Review your transfer
                    </Text>
                </View>

                <ScrollView contentContainerStyle={{
                    paddingBottom: 70,
                }}>
                    <View style={{
                        marginHorizontal: 30,
                        alignItems: 'flex-start',
                        justifyContent: 'flex-start',
                    }}>
                        <Text style={{ fontSize: 13, color: this.props.screenProps.theme.slightlyMoreVisibleColour }}>
                            <Text style={{ color: this.props.screenProps.theme.primaryColour, fontWeight: 'bold' }}>
                                {prettyPrintAmount(this.props.navigation.state.params.amount.remainingAtomic)}{' '}
                            </Text>
                            will reach{' '}
                            <Text style={{ color: this.props.screenProps.theme.primaryColour, fontWeight: 'bold' }}>
                                {this.props.navigation.state.params.payee.nickname}'s{' '}
                            </Text>
                            account, in {getArrivalTime()}
                        </Text>

                        <View style={{
                            alignItems: 'flex-start',
                            justifyContent: 'flex-start',
                        }}>
                            <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                marginTop: 15,
                                width: '100%',
                                justifyContent: 'space-between'
                            }}>
                                <Text style={{
                                    color: this.props.screenProps.theme.primaryColour,
                                    fontWeight: 'bold',
                                }}>
                                    Notes
                                </Text>

                                <Button
                                    title='Change'
                                    onPress={() => {
                                        this.setState({
                                            modifyMemo: !this.state.modifyMemo,
                                        });
                                    }}
                                    titleStyle={{
                                        color: this.props.screenProps.theme.primaryColour,
                                        fontSize: 13
                                    }}
                                    type="clear"
                                />
                            </View>
                        </View>

                        <View style={{ borderWidth: 0.7, borderColor: 'lightgrey', width: '100%' }} />
                    </View>

                    <View style={{
                        alignItems: 'flex-start',
                        justifyContent: 'flex-start',
                        marginHorizontal: this.state.modifyMemo ? 20 : 30,
                        marginTop: 20,
                    }}>
                        {this.state.modifyMemo ?
                            <ModifyMemo
                                memo={this.state.memo}
                                onChange={(text) => {
                                    this.setState({
                                        memo: text,
                                    })
                                }}
                                {...this.props}
                            />
                            :
                            <Text style={{ color: this.props.screenProps.theme.primaryColour, fontSize: 16 }}>
                                {this.state.memo === '' ? 'None' : this.state.memo}
                            </Text>
                        }
                    </View>

                    <View style={{
                        marginHorizontal: 30,
                        alignItems: 'flex-start',
                        justifyContent: 'flex-start',
                    }}>
                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            marginTop: 15,
                            width: '100%',
                            justifyContent: 'space-between'
                        }}>
                            <Text style={{ fontSize: 15, color: this.props.screenProps.theme.primaryColour, fontWeight: 'bold' }}>
                                {this.props.navigation.state.params.payee.nickname}'s details
                            </Text>

                            <Button
                                title='Change'
                                onPress={() => {
                                    this.props.navigation.navigate('ChoosePayee');
                                }}
                                titleStyle={{
                                    color: this.props.screenProps.theme.primaryColour,
                                    fontSize: 13
                                }}
                                type="clear"
                            />
                        </View>

                        <View style={{ borderWidth: 0.7, borderColor: 'lightgrey', width: '100%' }} />

                        <Text style={{ marginBottom: 5, marginTop: 20, color: this.props.screenProps.theme.slightlyMoreVisibleColour }}>
                            Address
                        </Text>

                        <Text style={{ color: this.props.screenProps.theme.primaryColour, fontSize: 16 }}>
                            {this.props.navigation.state.params.payee.address}
                        </Text>

                        {this.props.navigation.state.params.payee.paymentID !== '' &&
                            <View>
                                <Text style={{ marginBottom: 5, marginTop: 20 }}>
                                    Payment ID
                            </Text>

                                <Text style={{ color: this.props.screenProps.theme.primaryColour, fontSize: 16 }}>
                                    {this.props.navigation.state.params.payee.paymentID}
                                </Text>
                            </View>}

                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            marginTop: 15,
                            width: '100%',
                            justifyContent: 'space-between'
                        }}>
                            <Text style={{ fontSize: 15, color: this.props.screenProps.theme.primaryColour, fontWeight: 'bold' }}>
                                Transfer details
                            </Text>

                            <Button
                                title='Change'
                                onPress={() => {
                                    this.props.navigation.navigate(
                                        'Transfer', {
                                            payee: this.props.navigation.state.params.payee,
                                        }
                                    );
                                }}
                                titleStyle={{
                                    color: this.props.screenProps.theme.primaryColour,
                                    fontSize: 13
                                }}
                                type="clear"
                            />
                        </View>

                        <View style={{ borderWidth: 0.7, borderColor: 'lightgrey', width: '100%' }} />

                        <Text style={{ marginBottom: 5, marginTop: 20, color: this.props.screenProps.theme.slightlyMoreVisibleColour }}>
                            You're sending
                        </Text>

                        <Text style={{ color: this.props.screenProps.theme.primaryColour, fontSize: 16 }}>
                            {prettyPrintAmount(this.props.navigation.state.params.amount.originalAtomic)}
                        </Text>

                        <Text style={{ marginBottom: 5, marginTop: 20, color: this.props.screenProps.theme.slightlyMoreVisibleColour }}>
                            {this.props.navigation.state.params.payee.nickname} gets
                        </Text>

                        <Text style={{ color: this.props.screenProps.theme.primaryColour, fontSize: 16 }}>
                            {prettyPrintAmount(this.props.navigation.state.params.amount.remainingAtomic)}
                        </Text>

                        <Text style={{ marginBottom: 5, marginTop: 20, color: this.props.screenProps.theme.slightlyMoreVisibleColour }}>
                            Network fee
                        </Text>

                        <Text style={{ color: this.props.screenProps.theme.primaryColour, fontSize: 16 }}>
                            {prettyPrintAmount(this.props.navigation.state.params.amount.networkFeeAtomic)}
                        </Text>

                        {this.props.navigation.state.params.amount.devFeeAtomic > 0 &&
                            <View>
                                <Text style={{ marginBottom: 5, marginTop: 20, color: this.props.screenProps.theme.slightlyMoreVisibleColour }}>
                                    Developer fee
                            </Text>

                                <Text style={{ color: this.props.screenProps.theme.primaryColour, fontSize: 16 }}>
                                    {prettyPrintAmount(this.props.navigation.state.params.amount.devFeeAtomic)}
                                </Text>
                            </View>}

                        {this.props.navigation.state.params.amount.nodeFeeAtomic > 0 &&
                            <View>
                                <Text style={{ marginBottom: 5, marginTop: 20, color: this.props.screenProps.theme.slightlyMoreVisibleColour }}>
                                    Node fee
                            </Text>

                                <Text style={{ color: this.props.screenProps.theme.primaryColour, fontSize: 16 }}>
                                    {prettyPrintAmount(this.props.navigation.state.params.amount.nodeFeeAtomic)}
                                </Text>
                            </View>}

                        {this.props.navigation.state.params.amount.totalFeeAtomic > this.props.navigation.state.params.amount.networkFeeAtomic &&
                            <View>
                                <Text style={{ marginBottom: 5, marginTop: 20, color: this.props.screenProps.theme.slightlyMoreVisibleColour }}>
                                    Total fee
                            </Text>

                                <Text style={{ color: this.props.screenProps.theme.primaryColour, fontSize: 16 }}>
                                    {prettyPrintAmount(this.props.navigation.state.params.amount.totalFeeAtomic)}
                                </Text>
                            </View>}

                    </View>
                </ScrollView>

                <BottomButton
                    title="Send Transaction"
                    onPress={() => {
                        const params = {
                            amount: this.props.navigation.state.params.amount,
                            address: this.props.navigation.state.params.payee.address,
                            paymentID: this.props.navigation.state.params.payee.paymentID,
                            nickname: this.props.navigation.state.params.payee.nickname,
                            memo: this.state.memo,
                        };

                        if (Globals.preferences.pinConfirmation) {
                            /* Verify they have the correct pin, then send the actual TX */
                            this.props.navigation.navigate('RequestPin', {
                                subtitle: 'to confirm the transaction',
                                finishFunction: () => {
                                    this.props.navigation.dispatch(navigateWithDisabledBack('ChoosePayee'));
                                    this.props.navigation.navigate('SendTransaction', { ...params });
                                }
                            });
                        } else {
                            /* Reset this stack to be on the transfer screen */
                            this.props.navigation.dispatch(navigateWithDisabledBack('ChoosePayee'));

                            /* Then send the actual transaction */
                            this.props.navigation.navigate('SendTransaction', { ...params });
                        }
                    }}
                    {...this.props}
                />
            </View>
        );
    }
}

export class ChoosePayeeScreen extends React.Component {
    constructor(props) {
        super(props);
    }

    static navigationOptions = ({ navigation, screenProps }) => {
        return {
            headerLeft: (
                <HeaderBackButton
                    tintColor={screenProps.theme.primaryColour}
                    onPress={() => { navigation.navigate('Main') }}
                />
            ),
            headerRight: (
                <CrossButton navigation={navigation} />
            ),
        }
    };

    handleQrCode(qrData, navigation) {
        const error = this.parseQrCodeData(qrData, navigation);

        if (error) {
            Alert.alert(
                'Cannot send transaction',
                error,
                [
                    { text: 'OK' },
                ]
            );
        }
    }

    parseQrCodeData(qrData, navigation) {
        /* It's a URI, try and get the data from it */
        if (qrData.startsWith(Config.uriPrefix)) {
            /* Remove the turtlecoin:// prefix */
            let data = qrData.replace(Config.uriPrefix, '');

            const index = data.indexOf('?');

            /* Not valid URI */
            if (index === -1) {
                index = data.length;
            }

            const address = data.substr(0, index);
            const params = Qs.parse(data.substr(index));

            const amount = params.amount;
            const name = params.name;
            let paymentID = params.paymentid;

            if (paymentID) {
                const pidError = validatePaymentID(paymentID);

                /* Payment ID isn't valid. */
                if (pidError.errorCode !== WalletErrorCode.SUCCESS) {
                    return 'QR code is not valid!';
                }

                /* Both integrated address and payment ID given */
                if (address.length === Config.integratedAddressLength && paymentID.length !== 0) {
                    return 'QR code is not valid!';
                }
            }

            const addressError = validateAddresses([address], true);

            /* Address isn't valid */
            if (addressError.errorCode !== WalletErrorCode.SUCCESS) {
                return 'QR code is not valid!';
            }

            const amountAtomic = Number(amount);
            let feeInfo = undefined;
            let amountNonAtomic = undefined;

            if (!isNaN(amountAtomic)) {
                amountNonAtomic = amountAtomic / (10 ** Config.decimalPlaces);

                /* Got an amount, can go straight to confirmation, if we have enough balance */
                const [unlockedBalance, lockedBalance] = Globals.wallet.getBalance();

                feeInfo = addFee(amountNonAtomic);

                let [valid, error] = validAmount(feeInfo.original, unlockedBalance);

                if (feeInfo.originalAtomic > unlockedBalance) {
                    error = 'Not enough funds available! Needed (including fees): ' +
                        `${prettyPrintAmount(feeInfo.originalAtomic)}, Available: ` +
                        prettyPrintAmount(unlockedBalance);
                }

                if (!valid) {
                    return error;
                }
            }

            /* No name, need to pick one.. */
            if (!name) {
                navigation.navigate(
                    'NewPayee', {
                        paymentID: paymentID || '',
                        address,
                        amount: amountNonAtomic ? amountNonAtomic.toString() : undefined,
                    }
                );

                return undefined;
            }

            const newPayee = {
                nickname: name,
                address: address,
                paymentID: paymentID || '',
            }

            const existingPayee = Globals.payees.find((p) => p.nickname === name);

            /* Payee exists already */
            if (existingPayee) {
                /* New payee doesn't match existing payee, get them to enter a new name */
                if (existingPayee.address !== newPayee.address ||
                    existingPayee.paymentID !== newPayee.paymentID) {
                    navigation.navigate(
                        'NewPayee', {
                            paymentID: paymentID || '',
                            address,
                            amount: amountNonAtomic.toString(),
                        }
                    );

                    return undefined;
                }
                /* Save payee to database for later use */
            } else {
                Globals.addPayee(newPayee);
            }

            if (!amount) {
                navigation.navigate(
                    'Transfer', {
                        payee: newPayee,
                    }
                );

                return undefined;
            } else {
                navigation.navigate(
                    'Confirm', {
                        payee: newPayee,
                        amount: feeInfo,
                    }
                );
            }
            /* It's a standard address, try and parse it (or something else) */
        } else {
            const addressError = validateAddresses([qrData], true);

            if (addressError.errorCode !== WalletErrorCode.SUCCESS) {
                return 'QR code is not valid!';
            }

            navigation.navigate(
                'NewPayee', {
                    address: qrData,
                }
            );

            return undefined;
        }

        return undefined;
    }

    render() {
        return (
            <View style={{
                backgroundColor: this.props.screenProps.theme.backgroundColour,
                flex: 1,
            }}>
                <View style={{
                    alignItems: 'flex-start',
                    justifyContent: 'flex-start',
                    marginLeft: 30,
                    marginTop: 60,
                    marginRight: 10,
                }}>
                    <Text style={{ color: this.props.screenProps.theme.primaryColour, fontSize: 25, marginBottom: 30 }}>
                        Who are you sending to?
                    </Text>
                </View>

                <View style={{
                    marginLeft: 22,
                    alignItems: 'flex-start',
                    justifyContent: 'flex-start',
                }}>
                    <Button
                        title='Scan QR Code'
                        onPress={() => {
                            const func = (data) => {
                                this.handleQrCode(data, this.props.navigation);
                            };

                            this.props.navigation.navigate('QrScanner', {
                                setAddress: func
                            });
                        }}
                        titleStyle={{
                            color: this.props.screenProps.theme.primaryColour,
                            textDecorationLine: 'underline',
                        }}
                        type="clear"
                    />
                </View>

                <View style={{
                    alignItems: 'flex-start',
                    justifyContent: 'flex-start',
                    marginLeft: 30,
                    marginRight: 10,
                }}>
                    <Hr />

                    <TouchableWithoutFeedback
                        onPress={() => {
                            this.props.navigation.navigate('NewPayee');
                        }}
                    >
                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginTop: 10,
                        }}>
                            <View style={{
                                height: 37,
                                width: 37,
                                borderWidth: 1,
                                borderColor: this.props.screenProps.theme.notVeryVisibleColour,
                                borderRadius: 45,
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}>
                                <SimpleLineIcons
                                    name={'user-follow'}
                                    size={24}
                                    color={this.props.screenProps.theme.slightlyMoreVisibleColour}
                                    padding={5}
                                />
                            </View>

                            <Text style={{ marginLeft: 15, color: this.props.screenProps.theme.primaryColour, fontSize: 16 }}>
                                Add a new recipient
                            </Text>
                        </View>
                    </TouchableWithoutFeedback>

                    <Hr />

                    <ExistingPayees {...this.props} />
                </View>
            </View>
        );
    }
}

export class SendTransactionScreen extends React.Component {
    static navigationOptions = {
        header: null,
    }

    constructor(props) {
        super(props);

        this.state = {
            txInfo: 'Sending transaction, please wait...',
            errMsg: '',
            hash: '',
            amount: this.props.navigation.state.params.amount,
            address: this.props.navigation.state.params.address,
            paymentID: this.props.navigation.state.params.paymentID,
            nickname: this.props.navigation.state.params.nickname,
            memo: this.props.navigation.state.params.memo,
            homeEnabled: false,
        }

        /* Send the tx in the background (it's async) */
        this.sendTransaction();
    }

    async sendTransaction() {
        /* Wait for UI to load before blocking thread */
        await delay(500);

        const payments = [];

        /* User payment */
        payments.push([this.state.address, this.state.amount.remainingAtomic]);

        /* Dev payment */
        if (this.state.amount.devFeeAtomic > 0) {
            payments.push([Config.devFeeAddress, this.state.amount.devFeeAtomic]);
        }

        /* Leaving everything else as default, minus payments and paymentID */
        const [hash, error] = await Globals.wallet.sendTransactionAdvanced(
            payments, undefined, undefined, this.state.paymentID, undefined,
            undefined,
        );

        if (error) {
            this.setState({
                errMsg: error.toString(),
                homeEnabled: true,
            });
        } else {
            this.setState({
                hash,
                homeEnabled: true,
            });

            Globals.addTransactionDetails({
                hash: hash,
                memo: this.state.memo,
                address: this.state.address,
                payee: this.state.nickname,
            });
        }
    }

    render() {
        const sending =
            <View>
                <Text style={{
                    color: this.props.screenProps.theme.primaryColour,
                    fontSize: 25,
                }}>
                    Sending transaction, please wait...
                </Text>
            </View>;

        const fail =
            <View>
                <Text style={{
                    color: 'red',
                    fontSize: 25,
                    marginBottom: 25,
                    fontWeight: 'bold',
                }}>
                    Transaction failed!
                </Text>

                <Text style={{ fontSize: 13 }}>
                    {this.state.errMsg}
                </Text>
            </View>;

        const success =
            <View>
                <Text style={{
                    color: this.props.screenProps.theme.primaryColour,
                    fontSize: 25,
                    marginBottom: 25,
                    fontWeight: 'bold'
                }}>
                    Transaction complete
                </Text>

                <Text style={{ fontSize: 13, color: this.props.screenProps.theme.slightlyMoreVisibleColour }}>
                    <Text style={{ color: this.props.screenProps.theme.primaryColour, fontWeight: 'bold' }}>
                        {prettyPrintAmount(this.state.amount.remainingAtomic)}{' '}
                    </Text>
                    was sent to{' '}
                    <Text style={{ color: this.props.screenProps.theme.primaryColour, fontWeight: 'bold' }}>
                        {this.state.nickname}'s{' '}
                    </Text>
                    account.
                </Text>

                <Text style={{ fontSize: 15, color: this.props.screenProps.theme.primaryColour, fontWeight: 'bold', marginTop: 15 }}>
                    Transaction hash
                </Text>

                <TextTicker
                    marqueeDelay={1000}
                    duration={220 * 64}
                    style={{
                        color: this.props.screenProps.theme.slightlyMoreVisibleColour,
                    }}
                >
                    {this.state.hash}
                </TextTicker>

                <Button
                    containerStyle={{
                        alignItems: 'flex-start',
                        justifyContent: 'flex-start',
                        marginLeft: -8
                    }}
                    title='Copy'
                    onPress={() => {
                        Clipboard.setString(this.state.hash);
                        toastPopUp('Transaction hash copied');
                    }}
                    titleStyle={{
                        color: this.props.screenProps.theme.primaryColour,
                        fontSize: 13
                    }}
                    type="clear"
                />

            </View>;

        return (
            <View style={{ flex: 1, backgroundColor: this.props.screenProps.theme.backgroundColour }}>
                <View style={{
                    flex: 1,
                    alignItems: 'flex-start',
                    justifyContent: 'flex-start',
                    marginTop: 60,
                    marginHorizontal: 30,
                }}>
                    {this.state.hash !== '' ? success : this.state.errMsg === '' ? sending : fail}
                </View>

                <BottomButton
                    title="Home"
                    onPress={() => {
                        this.props.navigation.dispatch(navigateWithDisabledBack('ChoosePayee'));
                        this.props.navigation.navigate('Main');
                    }}
                    disabled={!this.state.homeEnabled}
                    {...this.props}
                />
            </View>
        );
    }
}
