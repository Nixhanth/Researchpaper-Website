package com.researcher.tool.dto;

public class OtpVerificationRequest {
    private String email;
    private String otp;

    public OtpVerificationRequest() {
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getOtp() {
        return otp;
    }

    public void setOtp(String otp) {
        this.otp = otp;
    }
}
