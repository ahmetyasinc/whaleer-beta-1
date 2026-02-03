import ResetPasswordForm from "@/components/ResetPasswordForm";

export default async function ResetPasswordPage({ params }) {
    const { locale } = await params;
    return <ResetPasswordForm locale={locale} />;
}
