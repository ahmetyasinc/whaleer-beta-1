import UpdatePasswordForm from "@/components/UpdatePasswordForm";

export default async function UpdatePasswordPage({ params }) {
    const { locale } = await params;
    return <UpdatePasswordForm locale={locale} />;
}
