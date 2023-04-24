import axios from "axios";

const MIN_CR = 11_000;

const MAX_BPS = 10_000;
const FLASH_FEE = 30;

// 100eth
const INITIAL_STETH_BAL = 100;

const getFlashFee = (amount: number): number => (amount * FLASH_FEE) / MAX_BPS;

// 2e18
const MIN_CDP = 2;

interface LeverageInfo {
  numberOfCycle: number;
  finalDeposit: number;
  finalDebt: number;
}

// LOOP LOGIC
const isNewDepositBelowThreshold = (
  newCollateral: number,
  price: number
): boolean => (newCollateral * MAX_BPS) / price / MIN_CR < MIN_CDP;

const getMaxDebtFromColl = (coll: number, price: number): number =>
  (coll * MAX_BPS) / price / MIN_CR;

const fromNewDebtToColl = (newDebt: number, price: number): number => {
  // Simulate selling into the pool, could actuall set into the pool in the future
  return newDebt * price;
};

// CG PRICE API
const getPrice = async () => {
  const data = await axios(
    "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=eth"
  );
  return data.data.bitcoin.eth;
};

const getMaxLeverage = async (amount: number): Promise<LeverageInfo> => {
  const price = await getPrice();
  let found = false;
  let newCollateral = amount;

  let numberOfCycle = 0;

  const simulatedCdp = {
    debt: 0,
    coll: 0,
  };
  let counter = 0;
  while (counter < 25) {
    counter += 1;
    // We break
    found = isNewDepositBelowThreshold(newCollateral, price);
    console.log("found", found);
    if (found) {
      break;
    }

    simulatedCdp.coll += newCollateral;
    const prevDebt = simulatedCdp.debt;
    simulatedCdp.debt = getMaxDebtFromColl(simulatedCdp.coll, price);
    console.log("simulatedCdp.debt", simulatedCdp.debt);

    const newDebt = simulatedCdp.debt - prevDebt;
    numberOfCycle += 1;

    newCollateral = fromNewDebtToColl(newDebt, price);
    console.log("newCollateral", newCollateral);
  }

  const result = {
    numberOfCycle,
    finalDeposit: simulatedCdp.coll,
    finalDebt: simulatedCdp.debt,
  };

  console.log("result", result);

  return result;
};

console.log("getMaxLeverage", getMaxLeverage(INITIAL_STETH_BAL));

// In practice, you flashloan the stETH -> Deposit -> Buy it back and repay + the stETH you have
// Or, flashloan eBTC -> Buy stETH -> Deposit + the one you have -> Borrow eBTC -> Repay
