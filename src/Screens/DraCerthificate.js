import React, { useRef, useState } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import LottieView from 'lottie-react-native';
import LoadingAnimation from '../assets/animations/Loading.json';
import colors from '../CommonFiles/Colors';
import { useNavigation, useRoute } from '@react-navigation/native';
import Entypo from 'react-native-vector-icons/Entypo';

const DraCertificate = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { link } = route.params || {};
    const webViewRef = useRef(null);
    const [loading, setLoading] = useState(true);

    // HTML template with zooming capability
    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">
            <style>
                * {
                    box-sizing: border-box;
                }
                body {
                    margin: 0;
                    padding: 0;
                    background-color: #d5d7dbff;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    touch-action: manipulation;
                }
                .img-container {
                    width: 100%;
                    height: 100vh;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    overflow: hidden;
                }
                img {
                    max-width: 100%;
                    max-height: 100%;
                    width: auto;
                    height: auto;
                    border-radius: 8px;
                    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                    object-fit: contain;
                }
                @media (min-width: 768px) {
                    img {
                        max-width: 90%;
                        max-height: 90%;
                    }
                }
            </style>
        </head>
        <body>
            <div class="img-container">
                <img src="${link}" onload="window.ReactNativeWebView.postMessage('imageLoaded')" />
            </div>
        </body>
        </html>
    `;

    if (!link) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <LottieView
                    source={LoadingAnimation}
                    autoPlay
                    loop
                    style={{ width: 200, height: 200 }}
                />
                <Text style={{ marginTop: 20, color: 'black', fontFamily: 'Inter-Regular' }}>No certificate link found.</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
            {/* Header */}
            <View
                style={{
                    backgroundColor: colors.Brown,
                    padding: 15,
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'center'
                }}
            >
                <TouchableOpacity
                    style={{ position: 'absolute', left: 15 }}
                    onPress={() => {
                        navigation.goBack();
                    }}>
                    <Entypo name="cross" size={30} color="white" />
                </TouchableOpacity>
                <Text
                    style={{
                        color: 'white',
                        fontSize: 20,
                        fontWeight: 'bold',
                        fontFamily: 'Inter-Bold',
                    }}
                >
                    DRA Certificate
                </Text>
            </View>

            {/* WebView */}
            <View style={{ flex: 1 }}>
                {loading && (
                    <View style={styles.loadingContainer}>
                        <LottieView
                            source={LoadingAnimation}
                            autoPlay
                            loop
                            style={{ width: 100, height: 100 }}
                        />
                    </View>
                )}
                <WebView
                    ref={webViewRef}
                    originWhitelist={['*']}
                    source={{ html: htmlContent }}
                    style={{ flex: 1, backgroundColor: '#d5d7dbff' }}
                    onMessage={(event) => {
                        if (event.nativeEvent.data === 'imageLoaded') {
                            setLoading(false);
                        }
                    }}
                    onError={(syntheticEvent) => {
                        const { nativeEvent } = syntheticEvent;
                        console.warn('WebView error: ', nativeEvent);
                        setLoading(false);
                    }}
                    allowsInlineMediaPlayback={true}
                    allowsFullscreenVideo={false}
                    allowsBackForwardNavigationGestures={true}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    startInLoadingState={true}
                    scalesPageToFit={Platform.OS === 'android' ? true : false}
                />
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    loadingContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'white',
        zIndex: 1
    }
});

export default DraCertificate;