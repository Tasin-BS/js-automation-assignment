import { expect } from "@wdio/globals";
import fs from "fs";
import csvParser from "csv-parser";

// Scenario 1: Verify Locked Out User
describe("Verify Locked Out User", () => {
  it("should display an error message for a locked-out user", async () => {
    // Activate the app
    await driver.activateApp("com.swaglabsmobileapp");

    // Scroll to the element if needed
    await driver.execute("mobile: scroll", {
      strategy: "accessibility id",
      selector: "test-standard_user",
    });

    // Click the selector to auto-fill the fields
    const autoFillSelector = await $(
      'android=new UiSelector().text("locked_out_user")'
    );
    await autoFillSelector.click();

    // Scroll to the element if needed
    await driver.execute("mobile: scroll", {
      strategy: "accessibility id",
      selector: "test-Username",
    });

    // Click the login button
    const loginButton = await $("~test-LOGIN");
    await loginButton.click();

    // Assert the locked-out error message
    const errorMessage = await $(
      'android=new UiSelector().text("Sorry, this user has been locked out.")'
    );
    await expect(errorMessage).toBeDisplayed();
  });
});

// Scenario 2
const scrollToElement = async (strategy, selector) => {
  await driver.execute("mobile: scroll", {
    direction: "down",
    strategy: strategy,
    selector: selector,
  });
};

const clickElementByText = async (text) => {
  const element = await $(`android=new UiSelector().text("${text}")`);
  await element.waitForDisplayed({ timeout: 5000 });
  await element.click();
};

const clickElementByDescription = async (description) => {
  const element = await $(`android=new UiSelector().description("${description}")`);
  await element.waitForDisplayed({ timeout: 15000 });
  await element.click();
};

// Scenario2: Sign in as Standard User
describe("Sign in as Standard User", () => {
  let userData = {};

  before(async () => {
    // Read data from CSV
    await new Promise((resolve, reject) => {
      fs.createReadStream("data.csv")
        .pipe(csvParser())
        .on("data", (row) => userData = row)
        .on("end", resolve)
        .on("error", reject);
    });
  });

  it("should sign in successfully and complete the checkout process", async () => {
    await driver.activateApp("com.swaglabsmobileapp");

    // Log in with the standard user
    await clickElementByText("standard_user");
    await clickElementByDescription("test-LOGIN");

    // Verify we have navigated to the home page
    const homePageElement = await $('android=new UiSelector().className("android.widget.ImageView").instance(6)');
    await homePageElement.waitForDisplayed({ timeout: 5000 });
    await expect(homePageElement).toBeDisplayed();

    // Filter products by price (low to high) and add products to the cart
    await clickElementByDescription("test-Modal Selector Button");
    await clickElementByText("Price (low to high)");
    await clickElementByDescription("test-ADD TO CART");

    // Store the price of the first product for verification
    const firstProductPrice = await $('//android.widget.TextView[@text="$9.99"]');
    await expect(firstProductPrice).toBeDisplayed();

    // Verify "Add to Cart" changed to "Remove"
    const removeButton = await $('~test-REMOVE');
    await removeButton.waitForDisplayed({ timeout: 15000 });
    await expect(removeButton).toBeDisplayed();

    // Add second product
    await clickElementByText("Sauce Labs Onesie");
    await scrollToElement("-android uiautomator", `new UiSelector().text("ADD TO CART")`);
    await clickElementByDescription("test-ADD TO CART");

    // Verify cart badge displays correct item count
    const cartBadge = await $('//android.widget.TextView[@text="2"]');
    await cartBadge.waitForDisplayed({ timeout: 15000 });
    await expect(cartBadge).toHaveText("2");

    // Proceed to cart and verify products
    await clickElementByDescription("test-Cart");
    await expect(await $(`android=new UiSelector().text("Sauce Labs Onesie")`)).toBeDisplayed();
    await expect(await $(`android=new UiSelector().text("Sauce Labs Bike Light")`)).toBeDisplayed();

    // Begin checkout process
    await clickElementByDescription("test-CHECKOUT");

    // Fill out checkout form
    await (await $("~test-First Name")).setValue(userData.FirstName);
    await (await $("~test-Last Name")).setValue(userData.LastName);
    await (await $("~test-Zip/Postal Code")).setValue(userData.PostalCode);

    await clickElementByDescription("test-CONTINUE");

    // Verify item total
    const itemTotal = await $(`android=new UiSelector().text("Item total: $17.98")`);
    await itemTotal.waitForDisplayed({ timeout: 5000 });
    await expect(itemTotal).toHaveText("Item total: $17.98");

    // Complete checkout
    await clickElementByDescription("test-FINISH");
    const checkoutComplete = await $(`android=new UiSelector().text("CHECKOUT: COMPLETE!")`);
    await checkoutComplete.waitForDisplayed({ timeout: 5000 });
    await expect(checkoutComplete).toBeDisplayed();
  });
});
