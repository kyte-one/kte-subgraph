import {  Bytes, Value } from '@graphprotocol/graph-ts'


export function formatAssetFeedType(feedType: number): string {
    switch (feedType) {
        case 0: return 'Price';
        case 1: return 'Volume';
        case 2: return 'Rank';
        default: return 'Price';
    }
}