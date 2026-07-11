import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Shield, FileText, Cookie, Globe, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ReactNode } from "react";

interface PolicyDialogProps {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  trigger: React.ReactNode;
}

export function PolicyDialog({ title, icon: Icon, children, trigger }: PolicyDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Icon className="h-5 w-5 text-blue-600" />
            </div>
            <DialogTitle className="text-xl font-bold text-gray-900">{title}</DialogTitle>
          </div>
        </DialogHeader>
        <ScrollArea className="px-6 py-4 h-[60vh]">
          <div className="prose prose-sm max-w-none text-gray-600">
            {children}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export function PrivacyPolicyDialog({ trigger }: { trigger: React.ReactNode }) {
  return (
    <PolicyDialog title="Privacy Policy" icon={Shield} trigger={trigger}>
      <div className="space-y-4">
        <p className="text-sm text-gray-500">Last updated: March 31, 2026</p>
        
        <section>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">1. Introduction</h3>
          <p>WorkPulse ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our workforce management platform.</p>
        </section>

        <section>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">2. Information We Collect</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Personal Information:</strong> Name, email address, employee ID, department, and role information.</li>
            <li><strong>Work Data:</strong> Timesheets, task completions, performance metrics, and attendance records.</li>
            <li><strong>Usage Data:</strong> Login times, feature usage, and platform interactions.</li>
            <li><strong>Technical Data:</strong> IP address, browser type, device information, and cookies.</li>
          </ul>
        </section>

        <section>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">3. How We Use Your Information</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Provide and maintain our workforce management services</li>
            <li>Generate performance analytics and reports</li>
            <li>Process timesheets and attendance tracking</li>
            <li>Improve platform functionality and user experience</li>
            <li>Send notifications and important updates</li>
            <li>Ensure security and prevent fraud</li>
          </ul>
        </section>

        <section>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">4. Data Security</h3>
          <p>We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction. This includes encryption, secure servers, and regular security audits.</p>
        </section>

        <section>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">5. Your Rights</h3>
          <p>You have the right to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Access your personal data</li>
            <li>Correct inaccurate information</li>
            <li>Request deletion of your data</li>
            <li>Object to data processing</li>
            <li>Data portability</li>
          </ul>
        </section>

        <section>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">6. Contact Us</h3>
          <p>If you have any questions about this Privacy Policy, please contact us at privacy@workpulse.com</p>
        </section>
      </div>
    </PolicyDialog>
  );
}

export function TermsOfServiceDialog({ trigger }: { trigger: React.ReactNode }) {
  return (
    <PolicyDialog title="Terms of Service" icon={FileText} trigger={trigger}>
      <div className="space-y-4">
        <p className="text-sm text-gray-500">Last updated: March 31, 2026</p>
        
        <section>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">1. Acceptance of Terms</h3>
          <p>By accessing or using WorkPulse, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our platform.</p>
        </section>

        <section>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">2. Description of Service</h3>
          <p>WorkPulse provides a workforce management platform that includes:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Employee performance tracking</li>
            <li>Timesheet and attendance management</li>
            <li>KPI monitoring and analytics</li>
            <li>Task and project management</li>
            <li>Team collaboration tools</li>
          </ul>
        </section>

        <section>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">3. User Accounts</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>You must provide accurate and complete information when creating an account</li>
            <li>You are responsible for maintaining the security of your account credentials</li>
            <li>You must notify us immediately of any unauthorized access</li>
            <li>One person may only maintain one active account</li>
          </ul>
        </section>

        <section>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">4. Acceptable Use</h3>
          <p>You agree not to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Use the service for any illegal purpose</li>
            <li>Attempt to gain unauthorized access to any part of the platform</li>
            <li>Interfere with other users' access to the service</li>
            <li>Upload malicious software or content</li>
            <li>Reverse engineer or decompile the platform</li>
          </ul>
        </section>

        <section>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">5. Payment and Subscription</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Some features require a paid subscription</li>
            <li>Subscriptions auto-renew unless cancelled</li>
            <li>Refunds are provided according to our refund policy</li>
            <li>We reserve the right to change pricing with notice</li>
          </ul>
        </section>

        <section>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">6. Termination</h3>
          <p>We may terminate or suspend your account immediately for violations of these terms. Upon termination, your right to use the service will cease immediately.</p>
        </section>
      </div>
    </PolicyDialog>
  );
}

export function CookiePolicyDialog({ trigger }: { trigger: React.ReactNode }) {
  return (
    <PolicyDialog title="Cookie Policy" icon={Cookie} trigger={trigger}>
      <div className="space-y-4">
        <p className="text-sm text-gray-500">Last updated: March 31, 2026</p>
        
        <section>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">1. What Are Cookies</h3>
          <p>Cookies are small text files stored on your device when you visit our website. They help us provide, protect, and improve our services.</p>
        </section>

        <section>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">2. How We Use Cookies</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Essential Cookies:</strong> Required for the platform to function properly</li>
            <li><strong>Analytics Cookies:</strong> Help us understand how visitors interact with our platform</li>
            <li><strong>Functionality Cookies:</strong> Remember your preferences and settings</li>
            <li><strong>Security Cookies:</strong> Help identify and prevent security risks</li>
          </ul>
        </section>

        <section>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">3. Types of Cookies We Use</h3>
          <div className="space-y-2">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="font-medium text-gray-900">Session Cookies</p>
              <p className="text-sm text-gray-600">Temporary cookies that expire when you close your browser</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="font-medium text-gray-900">Persistent Cookies</p>
              <p className="text-sm text-gray-600">Remain on your device for a set period or until you delete them</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="font-medium text-gray-900">First-Party Cookies</p>
              <p className="text-sm text-gray-600">Set by WorkPulse directly</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="font-medium text-gray-900">Third-Party Cookies</p>
              <p className="text-sm text-gray-600">Set by our trusted partners (e.g., analytics providers)</p>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">4. Managing Cookies</h3>
          <p>Most web browsers allow you to control cookies through their settings. You can:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>View cookies stored on your device</li>
            <li>Delete specific cookies or all cookies</li>
            <li>Block cookies from specific websites</li>
            <li>Set preferences for cookie acceptance</li>
          </ul>
        </section>

        <section>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">5. Cookie Consent</h3>
          <p>By continuing to use our platform, you consent to our use of cookies as described in this policy. You can withdraw your consent at any time by adjusting your browser settings.</p>
        </section>
      </div>
    </PolicyDialog>
  );
}

export function GDPRDialog({ trigger }: { trigger: React.ReactNode }) {
  return (
    <PolicyDialog title="GDPR Compliance" icon={Globe} trigger={trigger}>
      <div className="space-y-4">
        <p className="text-sm text-gray-500">Last updated: March 31, 2026</p>
        
        <section>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">1. Our Commitment to GDPR</h3>
          <p>WorkPulse is fully committed to compliance with the General Data Protection Regulation (GDPR). We respect the privacy rights of all individuals within the European Union and ensure transparent data processing practices.</p>
        </section>

        <section>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">2. Data Controller Information</h3>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="font-medium text-gray-900">WorkPulse Ltd.</p>
            <p className="text-sm text-gray-600">Data Protection Officer: dpo@workpulse.com</p>
            <p className="text-sm text-gray-600">Registered Address: [Your Business Address]</p>
          </div>
        </section>

        <section>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">3. Your GDPR Rights</h3>
          <div className="space-y-2">
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="font-medium text-blue-900">Right to Access (Article 15)</p>
              <p className="text-sm text-blue-700">Request copies of your personal data</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="font-medium text-green-900">Right to Rectification (Article 16)</p>
              <p className="text-sm text-green-700">Request correction of inaccurate data</p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <p className="font-medium text-red-900">Right to Erasure (Article 17)</p>
              <p className="text-sm text-red-700">Request deletion of your personal data</p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg">
              <p className="font-medium text-yellow-900">Right to Data Portability (Article 20)</p>
              <p className="text-sm text-yellow-700">Receive data in a structured, machine-readable format</p>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">4. Legal Basis for Processing</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Contractual Necessity:</strong> Processing required to fulfill our service agreement</li>
            <li><strong>Consent:</strong> Where you have given explicit permission</li>
            <li><strong>Legal Obligation:</strong> Compliance with applicable laws</li>
            <li><strong>Legitimate Interests:</strong> Improving our services and ensuring security</li>
          </ul>
        </section>

        <section>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">5. Data Transfers</h3>
          <p>We ensure that any international data transfers comply with GDPR requirements through:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Standard Contractual Clauses (SCCs)</li>
            <li>Adequacy decisions by the European Commission</li>
            <li>Binding Corporate Rules where applicable</li>
          </ul>
        </section>

        <section>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">6. Contact Our DPO</h3>
          <p>For GDPR-related inquiries, contact our Data Protection Officer:</p>
          <p className="text-blue-600">dpo@workpulse.com</p>
          <p className="text-sm text-gray-600 mt-1">We will respond to all requests within 30 days as required by GDPR.</p>
        </section>
      </div>
    </PolicyDialog>
  );
}
