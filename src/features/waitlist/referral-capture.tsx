"use client";

import { useEffect } from "react";
import { captureReferral } from "./referral-actions";

type ReferralCaptureProps = {
  code: string;
};

export function ReferralCapture({ code }: ReferralCaptureProps) {
  useEffect(() => {
    void captureReferral(code);
  }, [code]);

  return null;
}
