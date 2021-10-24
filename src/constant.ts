import { BigDecimal, BigInt } from '@graphprotocol/graph-ts';

export const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000';
export const MARKET_FACTORY_ADDRESS = '0x1c85638e118b37167e9298c2268758e058DdfDA0';

export let ZERO_BI = BigInt.fromI32(0);
export let ONE_BI = BigInt.fromI32(1);
export let TWO_BI = BigInt.fromI32(2);
export let THREE_BI = BigInt.fromI32(3);
export let INFINITE_BI = BigInt.fromString('73786976294838210000');
export let ZERO_BD = BigDecimal.fromString('0');
export let ONE_BD = BigDecimal.fromString('1');
