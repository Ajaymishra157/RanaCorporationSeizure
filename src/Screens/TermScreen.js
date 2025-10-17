// TermsScreen.js
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    BackHandler,
} from 'react-native';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';

const TermsScreen = () => {
    const navigation = useNavigation();
    const [loading, setLoading] = useState(true);
    const route = useRoute(); // <-- add this line
    const staffId = route.params?.staffId || '';
    const webUrl = `https://ranacorporation.webmastersinfotech.com/admin/api/term_accept.php?staff_id=${staffId}`;

    // Prevent going back without accepting/rejecting
    useEffect(() => {
        const backAction = () => {
            // Prevent going back
            return true;
        };

        const backHandler = BackHandler.addEventListener(
            'hardwareBackPress',
            backAction
        );

        return () => backHandler.remove();
    }, []);

    const handleAccept = async () => {
        await AsyncStorage.setItem('terms_accepted', 'true');
        navigation.reset({
            index: 0,
            routes: [{ name: 'FirstScreen', params: { shouldSync: true } }],
        });
    };



    return (
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
            {/* Header */}
            <View style={{ backgroundColor: '#4CAF50', padding: 16, alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>
                    Code of Conduct
                </Text>
            </View>

            {/* WebView */}
            <View style={{ flex: 1, position: 'relative' }}>
                <WebView
                    source={{ uri: webUrl }}
                    onLoadEnd={() => setLoading(false)}
                    style={{ flex: 1 }}
                />
                {loading && (
                    <ActivityIndicator
                        size="large"
                        color="#4CAF50"
                        style={{
                            position: 'absolute',
                            top: '50%',
                            alignSelf: 'center',
                        }}
                    />
                )}
            </View>

            {/* Buttons */}
            <View style={{ flexDirection: 'row', padding: 16, gap: 10 }}>


                <TouchableOpacity
                    style={{
                        flex: 1,
                        backgroundColor: '#4CAF50',
                        paddingVertical: 12,
                        borderRadius: 4,
                        alignItems: 'center',
                    }}
                    onPress={handleAccept}
                >
                    <Text style={{ color: '#fff', fontSize: 16 }}>Accept</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default TermsScreen;