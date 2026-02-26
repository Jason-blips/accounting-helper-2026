import Layout from '../components/Layout';

const APP_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0';
const PRIVACY_URL = import.meta.env.VITE_PRIVACY_URL || '';

export default function About() {
  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">关于 Tally Drop 落记</h1>
          <p className="text-gray-600 mb-4">
            智能记账应用，助你记录收支、分析消费，并获取省钱建议。
          </p>
          <div className="py-3 border-b border-gray-100">
            <p className="text-sm text-gray-500 mb-1">开发者</p>
            <p className="font-medium text-gray-900">Zhuoran Fu</p>
          </div>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <dt className="text-gray-500">版本</dt>
              <dd className="font-medium text-gray-900">{APP_VERSION}</dd>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <dt className="text-gray-500">应用 ID</dt>
              <dd className="font-mono text-gray-700 text-xs">com.tallydrop.app</dd>
            </div>
          </dl>
        </div>
        {PRIVACY_URL && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">隐私与条款</h2>
            <a
              href={PRIVACY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              隐私政策
            </a>
          </div>
        )}
        <p className="text-center text-gray-400 text-sm">
          Thank you for using Tally Drop 落记.
        </p>
      </div>
    </Layout>
  );
}
