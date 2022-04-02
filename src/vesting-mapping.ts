import { VestingSchedule } from '../generated/schema';
import { AddVestingSchedule } from '../generated/TokenVesting/TokenVesting';
import { TOKEN_VESTING_ADDRESS } from './constant';
import { log } from '@graphprotocol/graph-ts';

export function handleAddVestingSchedule(event: AddVestingSchedule): void {
  let vestingSchedule = VestingSchedule.load(TOKEN_VESTING_ADDRESS);
  if (!vestingSchedule) {
    vestingSchedule = new VestingSchedule(TOKEN_VESTING_ADDRESS);
  }

  log.info('\n\n\n\n Schedule Id {}', [event.params.vestingScheduleId.toHexString()]);
  vestingSchedule.id = event.params.vestingScheduleId.toHexString();
  vestingSchedule.beneficiary = event.params.beneficiary;
  vestingSchedule.cliff = event.params.cliff.toI32();
  vestingSchedule.start = event.params.start.toI32();
  vestingSchedule.duration = event.params.duration.toI32();
  vestingSchedule.slicePeriodSeconds = event.params.slicePeriodSeconds.toI32();
  vestingSchedule.revocable = event.params.revocable;
  vestingSchedule.amountTotal = event.params.amountTotal;
  vestingSchedule.released = event.params.released;
  vestingSchedule.revoked = event.params.revoked;
  vestingSchedule.upFront = event.params.upFront;
  vestingSchedule.save();
}
