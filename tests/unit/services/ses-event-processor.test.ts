import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../src/config/env.js", () => ({
  env: () => ({
    MAX_BOUNCE_RATE: 0.05,
    MAX_COMPLAINT_RATE: 0.001,
  }),
}));

const {
  deliverEventMock,
  limitMock,
  whereMock,
  fromMock,
  selectMock,
  updateWhereMock,
  updateSetMock,
  updateMock,
} = vi.hoisted(() => ({
  deliverEventMock: vi.fn(),
  limitMock: vi.fn(),
  whereMock: vi.fn(),
  fromMock: vi.fn(),
  selectMock: vi.fn(),
  updateWhereMock: vi.fn(),
  updateSetMock: vi.fn(),
  updateMock: vi.fn(),
}));

whereMock.mockImplementation(() => ({ limit: limitMock }));
fromMock.mockImplementation(() => ({ where: whereMock }));
selectMock.mockImplementation(() => ({ from: fromMock }));
updateSetMock.mockImplementation(() => ({ where: updateWhereMock }));
updateMock.mockImplementation(() => ({ set: updateSetMock }));

vi.mock("../../../src/db/client.js", () => ({
  getDb: () => ({
    select: selectMock,
    update: updateMock,
  }),
}));

vi.mock("../../../src/services/webhook.service.js", () => ({
  deliverEvent: deliverEventMock,
}));

import {
  processSesEvent,
  type SesNotification,
} from "../../../src/services/ses-event.service.js";

describe("processSesEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ignores duplicate bounce notifications", async () => {
    limitMock.mockResolvedValueOnce([
      {
        id: "msg_123",
        accountId: "acct_123",
        inboxId: "inbox_123",
        status: "bounced",
      },
    ]);

    const event: SesNotification = {
      notificationType: "Bounce",
      mail: {
        messageId: "ses_123",
        source: "sender@example.com",
        destination: ["user@example.com"],
      },
      bounce: {
        bounceType: "Permanent",
        bounceSubType: "General",
        bouncedRecipients: [{ emailAddress: "user@example.com" }],
      },
    };

    await processSesEvent(event);

    expect(updateMock).not.toHaveBeenCalled();
    expect(deliverEventMock).not.toHaveBeenCalled();
  });
});
