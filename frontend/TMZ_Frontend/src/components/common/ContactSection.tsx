import { useState } from 'react';
import { Building2, MessageSquare } from 'lucide-react';
import { submitBusinessEnquiry, submitFeedback } from '@/lib/api';
import { Input, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/lib/toast';

interface ContactSectionProps {
  id?: string;
}

export function ContactSection({ id = 'contact' }: ContactSectionProps) {
  const { showToast } = useToast();

  // Business form
  const [bizForm, setBizForm] = useState({ name: '', company: '', purpose: '', phone: '', email: '' });
  const [bizErrors, setBizErrors] = useState<Record<string, string>>({});
  const [bizSubmitting, setBizSubmitting] = useState(false);
  const [bizSuccess, setBizSuccess] = useState('');

  // Feedback form
  const [feedback, setFeedback] = useState('');
  const [feedbackError, setFeedbackError] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState('');

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePhone = (phone: string) => /^[\d\s+()-]{7,20}$/.test(phone);

  const handleBizSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    const name = bizForm.name.trim();
    const company = bizForm.company.trim();
    const purpose = bizForm.purpose.trim();
    const phone = bizForm.phone.trim();
    const email = bizForm.email.trim();

    if (!name) errors.name = 'Name is required';
    if (name.length > 100) errors.name = 'Name is too long';
    if (!company) errors.company = 'Company is required';
    if (!purpose) errors.purpose = 'Purpose is required';
    if (purpose.length > 500) errors.purpose = 'Purpose is too long';
    if (!email) errors.email = 'Email is required';
    else if (!validateEmail(email)) errors.email = 'Invalid email format';
    if (!phone) errors.phone = 'Phone is required';
    else if (!validatePhone(phone)) errors.phone = 'Invalid phone format';

    setBizErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setBizSubmitting(true);
    setBizSuccess('');
    try {
      await submitBusinessEnquiry({ name, company, purpose, phone, email });
      setBizForm({ name: '', company: '', purpose: '', phone: '', email: '' });
      setBizSuccess('Thank you! Your business enquiry has been submitted successfully.');
    } catch {
      showToast('Could not send enquiry. Please try again.', 'error');
    } finally {
      setBizSubmitting(false);
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = feedback.trim();
    if (!content) {
      setFeedbackError('Please write your feedback');
      return;
    }
    if (content.length > 2000) {
      setFeedbackError('Feedback is too long (max 2000 characters)');
      return;
    }
    setFeedbackError('');
    setFeedbackSubmitting(true);
    setFeedbackSuccess('');
    try {
      await submitFeedback({ content });
      setFeedback('');
      setFeedbackSuccess('Thank you! Your feedback has been submitted successfully.');
    } catch {
      showToast('Could not submit feedback. Please try again.', 'error');
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  return (
    <section id={id} className="scroll-mt-20 max-w-7xl mx-auto w-full">
      <h2 className="font-display text-2xl sm:text-3xl text-primary text-center mb-6">Contact Us</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Business Enquiry */}
        <div className="glass-card p-6 md:p-8">
          <div className="flex items-center gap-2 mb-6">
            <Building2 className="w-5 h-5 text-brand-primary" />
            <h3 className="font-display text-xl text-primary">Business Enquiry</h3>
          </div>
          <form onSubmit={handleBizSubmit} className="space-y-4">
            <Input
              label="Name"
              value={bizForm.name}
              onChange={(e) => setBizForm({ ...bizForm, name: e.target.value })}
              error={bizErrors.name}
              maxLength={100}
              placeholder="Your full name"
            />
            <Input
              label="Company"
              value={bizForm.company}
              onChange={(e) => setBizForm({ ...bizForm, company: e.target.value })}
              error={bizErrors.company}
              maxLength={100}
              placeholder="Company name"
            />
            <Input
              label="Purpose"
              value={bizForm.purpose}
              onChange={(e) => setBizForm({ ...bizForm, purpose: e.target.value })}
              error={bizErrors.purpose}
              maxLength={500}
              placeholder="What is this about?"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Phone"
                value={bizForm.phone}
                onChange={(e) => setBizForm({ ...bizForm, phone: e.target.value })}
                error={bizErrors.phone}
                placeholder="+1 234 567 890"
              />
              <Input
                label="Email"
                type="email"
                value={bizForm.email}
                onChange={(e) => setBizForm({ ...bizForm, email: e.target.value })}
                error={bizErrors.email}
                placeholder="you@example.com"
              />
            </div>
            <Button type="submit" disabled={bizSubmitting} fullWidth>
              {bizSubmitting ? 'Sending...' : 'Submit Enquiry'}
            </Button>
            {bizSuccess && <p className="text-sm text-green-500" role="status">{bizSuccess}</p>}
          </form>
        </div>

        {/* Feedback */}
        <div className="glass-card p-6 md:p-8">
          <div className="flex items-center gap-2 mb-6">
            <MessageSquare className="w-5 h-5 text-brand-primary" />
            <h3 className="font-display text-xl text-primary">Feedback</h3>
          </div>
          <form onSubmit={handleFeedbackSubmit} className="space-y-4">
            <Textarea
              label="Your Feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              error={feedbackError}
              rows={8}
              maxLength={2000}
              placeholder="Share your thoughts, suggestions, or ideas..."
            />
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted">{feedback.length}/2000</span>
              <Button type="submit" disabled={feedbackSubmitting}>
                {feedbackSubmitting ? 'Sending...' : 'Submit Feedback'}
              </Button>
            </div>
            {feedbackSuccess && <p className="text-sm text-green-500" role="status">{feedbackSuccess}</p>}
          </form>
        </div>
      </div>
    </section>
  );
}
